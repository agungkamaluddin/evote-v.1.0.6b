export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SISTEM E-VOTING OSIS / OSIM MULTI-PERIODE BERBASIS SUPABASE POSTGRESQL
-- Asas LUBER JURDIL: Langsung, Umum, Bebas, Rahasia (Secret Ballot), Jujur, Adil
-- CATATAN: Salin seluruh kode SQL di bawah ini dan jalankan di Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipe Enum
DO $$ BEGIN
    CREATE TYPE org_type AS ENUM ('OSIS', 'OSIM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('OPEN', 'PAUSED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabel School Config (Profil Sekolah / Madrasah & Logo)
CREATE TABLE IF NOT EXISTS public.school_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    school_name VARCHAR(255) NOT NULL,
    organization_type org_type NOT NULL DEFAULT 'OSIS',
    logo_url TEXT,
    school_address TEXT DEFAULT '',
    principal_name VARCHAR(255) DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Periods (Multi-Periode Pemilihan Sekolah / Madrasah)
CREATE TABLE IF NOT EXISTS public.periods (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    year_label VARCHAR(20) NOT NULL UNIQUE, -- Contoh: '2026/2027'
    is_active BOOLEAN NOT NULL DEFAULT false,
    organization_type org_type NOT NULL DEFAULT 'OSIS',
    school_name VARCHAR(255) NOT NULL,
    voting_session_status session_status NOT NULL DEFAULT 'CLOSED',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger: Memastikan hanya 1 periode yang berstatus is_active = true
CREATE OR REPLACE FUNCTION public.ensure_single_active_period()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE public.periods
        SET is_active = false
        WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_active_period ON public.periods;
CREATE TRIGGER trigger_single_active_period
    BEFORE INSERT OR UPDATE OF is_active ON public.periods
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION public.ensure_single_active_period();

-- 5. Tabel Committees (Panitia Pemilihan berdasarkan SK)
CREATE TABLE IF NOT EXISTS public.committees (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    period_id TEXT NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sk_number VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Tabel Candidates (Pasangan Calon Ketua & Wakil Ketua)
CREATE TABLE IF NOT EXISTS public.candidates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    period_id TEXT NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    candidate_number INTEGER NOT NULL,
    leader_name VARCHAR(255) NOT NULL,
    vice_leader_name VARCHAR(255) DEFAULT '',
    photo_url TEXT,
    vision TEXT NOT NULL,
    mission TEXT[] NOT NULL DEFAULT '{}',
    work_programs TEXT[] DEFAULT '{}',
    motto VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_candidate_per_period UNIQUE (period_id, candidate_number)
);

-- 7. Tabel Students (DPT - Daftar Pemilih Tetap Siswa, Guru & Staf Tata Usaha)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    period_id TEXT NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    nisn VARCHAR(30) NOT NULL,
    pin VARCHAR(10) NOT NULL, -- PIN Acak 6-Digit Kredensial Pemilih
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    voter_type VARCHAR(20) NOT NULL DEFAULT 'SISWA', -- 'SISWA' | 'GURU' | 'TATA_USAHA'
    has_voted BOOLEAN NOT NULL DEFAULT false,
    voted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_nisn_per_period UNIQUE (period_id, nisn)
);

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS voter_type VARCHAR(20) NOT NULL DEFAULT 'SISWA';

-- 8. Tabel Votes (Pencatatan Surat Suara Sah)
-- PENTING: Didesain ANONIM tanpa kolom student_id untuk menjamin kerahasiaan bilik suara
CREATE TABLE IF NOT EXISTS public.votes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    period_id TEXT NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    candidate_id TEXT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Tabel App Users (Akun Login Petugas Admin & Panitia)
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'panitia', -- 'admin' | 'panitia'
    sk_number VARCHAR(100) DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Tabel Audit Logs (Catatan Aktivitas Sistem & Berita Acara)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    actor VARCHAR(255) NOT NULL
);

-- Indexing untuk query Live Count & Pencarian DPT berkecepatan tinggi
CREATE INDEX IF NOT EXISTS idx_votes_period_candidate ON public.votes (period_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_students_period_nisn ON public.students (period_id, nisn);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);

-- ==============================================================================
-- 11. STORED PROCEDURES (ATOMIC TRANSACTIONS ANTI DOUBLE-VOTING)
-- ==============================================================================

DROP FUNCTION IF EXISTS public.submit_vote_atomic(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.submit_vote_atomic(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_vote_atomic(
    p_period_id TEXT,
    p_nisn TEXT,
    p_pin TEXT,
    p_candidate_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_student_id TEXT;
    v_student_name TEXT;
    v_student_class TEXT;
    v_voter_type TEXT;
    v_has_voted BOOLEAN;
    v_session_status session_status;
    v_year_label TEXT;
    v_candidate_exists BOOLEAN;
    v_receipt TEXT;
    v_cat_label TEXT;
BEGIN
    -- A. Cek status sesi bilik suara
    SELECT voting_session_status, year_label
    INTO v_session_status, v_year_label
    FROM public.periods
    WHERE id = p_period_id;

    IF v_session_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Periode pemilihan tidak ditemukan.');
    ELSIF v_session_status = 'PAUSED' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bilik suara sedang dijeda sementara oleh panitia. Mohon tunggu.');
    ELSIF v_session_status = 'CLOSED' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sesi pemilihan telah ditutup. Bilik suara tidak lagi menerima suara.');
    END IF;

    -- B. Validasi Paslon
    SELECT EXISTS (
        SELECT 1 FROM public.candidates
        WHERE id = p_candidate_id AND period_id = p_period_id
    ) INTO v_candidate_exists;

    IF NOT v_candidate_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Paslon yang dipilih tidak valid untuk periode ini.');
    END IF;

    -- C. Kunci baris pemilih dengan FOR UPDATE untuk mencegah Race Condition / Double-Voting
    SELECT id, name, class_name, voter_type, has_voted
    INTO v_student_id, v_student_name, v_student_class, v_voter_type, v_has_voted
    FROM public.students
    WHERE period_id = p_period_id
      AND trim(nisn) = trim(p_nisn)
      AND trim(pin) = trim(p_pin)
    FOR UPDATE;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kredensial Nomor Induk Pemilih atau PIN 6-Digit tidak cocok.');
    END IF;

    IF v_has_voted = true THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Kredensial atas nama ' || v_student_name || ' (' || trim(p_nisn) || ') telah tercatat menggunakan hak suara. Pemilihan ganda ditolak.'
        );
    END IF;

    -- D. Transaksi Atomik:
    -- 1. Tandai pemilih sudah memilih
    UPDATE public.students
    SET has_voted = true, voted_at = timezone('utc'::text, now())
    WHERE id = v_student_id;

    -- 2. Masukkan surat suara anonim (tanpa student_id)
    INSERT INTO public.votes (id, period_id, candidate_id, created_at)
    VALUES (
        'vote-' || extract(epoch from clock_timestamp())::bigint::text || '-' || substr(md5(random()::text), 1, 6),
        p_period_id,
        p_candidate_id,
        timezone('utc'::text, now())
    );

    -- 3. Catat audit log anonim
    v_cat_label := CASE
        WHEN v_voter_type = 'GURU' THEN 'Dewan Guru'
        WHEN v_voter_type = 'TATA_USAHA' THEN 'Staf Tata Usaha'
        ELSE 'Siswa'
    END;

    INSERT INTO public.audit_logs (id, timestamp, action, details, actor)
    VALUES (
        'log-' || extract(epoch from clock_timestamp())::bigint::text || '-' || substr(md5(random()::text), 1, 5),
        timezone('utc'::text, now()),
        'Suara Masuk (Anonim)',
        '1 suara masuk tercatat secara rahasia. Kategori: ' || v_cat_label || ' (' || v_student_class || ')',
        'Sistem Bilik Suara'
    );

    -- 4. Buat receipt bukti sah voting
    v_receipt := 'EVOTE-' || replace(coalesce(v_year_label, '2026'), '/', '-') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Hak suara Anda berhasil disimpan secara rahasia dan sah ke database.',
        'receipt', v_receipt
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored Procedure: Kosongkan Kotak Suara (Reset Semua Suara Periode)
DROP FUNCTION IF EXISTS public.reset_votes_atomic(TEXT);
CREATE OR REPLACE FUNCTION public.reset_votes_atomic(p_period_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_deleted_votes INTEGER;
    v_reset_voters INTEGER;
    v_year_label TEXT;
BEGIN
    SELECT year_label INTO v_year_label FROM public.periods WHERE id = p_period_id;

    DELETE FROM public.votes WHERE period_id = p_period_id;
    GET DIAGNOSTICS v_deleted_votes = ROW_COUNT;

    UPDATE public.students
    SET has_voted = false, voted_at = NULL
    WHERE period_id = p_period_id AND (has_voted = true OR voted_at IS NOT NULL);
    GET DIAGNOSTICS v_reset_voters = ROW_COUNT;

    INSERT INTO public.audit_logs (id, timestamp, action, details, actor)
    VALUES (
        'log-' || extract(epoch from clock_timestamp())::bigint::text || '-' || substr(md5(random()::text), 1, 5),
        timezone('utc'::text, now()),
        'Reset Suara Masuk',
        'Kotak suara periode ' || coalesce(v_year_label, p_period_id) || ' dikosongkan. ' || v_deleted_votes || ' suara dihapus dan ' || v_reset_voters || ' pemilih dikembalikan ke Belum Memilih.',
        'Panitia Pemilihan'
    );

    RETURN jsonb_build_object(
        'success', true,
        'deletedVotesCount', v_deleted_votes,
        'resetVotersCount', v_reset_voters
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored Procedure: Reset Hak Suara Individu DPT
DROP FUNCTION IF EXISTS public.reset_individual_vote_atomic(TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.reset_individual_vote_atomic(
    p_student_id TEXT,
    p_deduct_vote BOOLEAN DEFAULT true,
    p_candidate_id_to_deduct TEXT DEFAULT NULL,
    p_new_pin TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT '',
    p_actor TEXT DEFAULT 'Panitia Pemilihan'
)
RETURNS JSONB AS $$
DECLARE
    v_student RECORD;
    v_was_voted BOOLEAN;
    v_final_pin TEXT;
    v_vote_id_to_delete TEXT;
    v_deducted BOOLEAN := false;
BEGIN
    SELECT * INTO v_student FROM public.students WHERE id = p_student_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Data pemilih tidak ditemukan.');
    END IF;

    v_was_voted := v_student.has_voted;
    v_final_pin := CASE WHEN p_new_pin IS NOT NULL AND length(trim(p_new_pin)) > 0 THEN trim(p_new_pin) ELSE v_student.pin END;

    UPDATE public.students
    SET has_voted = false, voted_at = NULL, pin = v_final_pin
    WHERE id = p_student_id;

    IF v_was_voted AND p_deduct_vote THEN
        IF p_candidate_id_to_deduct IS NOT NULL AND length(trim(p_candidate_id_to_deduct)) > 0 THEN
            SELECT id INTO v_vote_id_to_delete
            FROM public.votes
            WHERE period_id = v_student.period_id AND candidate_id = p_candidate_id_to_deduct
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;

        IF v_vote_id_to_delete IS NULL THEN
            SELECT id INTO v_vote_id_to_delete
            FROM public.votes
            WHERE period_id = v_student.period_id
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;

        IF v_vote_id_to_delete IS NOT NULL THEN
            DELETE FROM public.votes WHERE id = v_vote_id_to_delete;
            v_deducted := true;
        END IF;
    END IF;

    INSERT INTO public.audit_logs (id, timestamp, action, details, actor)
    VALUES (
        'log-' || extract(epoch from clock_timestamp())::bigint::text || '-' || substr(md5(random()::text), 1, 5),
        timezone('utc'::text, now()),
        'Reset Voting Individu (DPT)',
        'Status hak suara ' || v_student.name || ' (' || v_student.nisn || ') dikembalikan ke Belum Memilih.' ||
        CASE WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0 THEN ' Alasan: ' || trim(p_reason) ELSE '' END,
        coalesce(p_actor, 'Panitia Pemilihan')
    );

    RETURN jsonb_build_object(
        'success', true,
        'deductedVote', v_deducted,
        'pin', v_final_pin
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.school_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_config" ON public.school_config;
CREATE POLICY "Allow all school_config" ON public.school_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all periods" ON public.periods;
CREATE POLICY "Allow all periods" ON public.periods FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all committees" ON public.committees;
CREATE POLICY "Allow all committees" ON public.committees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all candidates" ON public.candidates;
CREATE POLICY "Allow all candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all students" ON public.students;
CREATE POLICY "Allow all students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all votes" ON public.votes;
CREATE POLICY "Allow all votes" ON public.votes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all app_users" ON public.app_users;
CREATE POLICY "Allow all app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 13. STORAGE BUCKET UNTUK LOGO & FOTO PASLON (OPSIONAL OTOMATIS)
-- ==============================================================================
DO $$ BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('evoting-assets', 'evoting-assets', true)
    ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "Public read evoting-assets" ON storage.objects;
    CREATE POLICY "Public read evoting-assets"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'evoting-assets');

    DROP POLICY IF EXISTS "Public upload evoting-assets" ON storage.objects;
    CREATE POLICY "Public upload evoting-assets"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'evoting-assets');
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- ==============================================================================
-- 14. ENABLE SUPABASE REALTIME
-- ==============================================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.school_config; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.periods; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.committees; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.students; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.votes; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs; EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

export const FOLDER_STRUCTURE_GUIDE = `
📁 Struktur Proyek (Vite + React + Supabase + Vercel):
├── 📁 public/
│   └── 📁 assets/images/        # Logo & Foto Default Paslon
├── 📁 src/
│   ├── 📁 components/
│   │   ├── Navbar.tsx           # Navigasi & Status Periode
│   │   ├── LiveCountChart.tsx   # Grafik Perolehan Suara Realtime
│   │   ├── CandidateCard.tsx    # Kartu & Modal Visi-Misi Paslon
│   │   ├── VoterBoothModal.tsx  # Bilik Suara Digital (NISN/NIP + PIN + Konfirmasi)
│   │   ├── CommitteeDashboard.tsx # Kelola DPT, PIN 6-Digit, Cetak Kartu
│   │   ├── AdminSchoolSettings.tsx# Pengaturan Sekolah, SK Panitia & Periode
│   │   └── SupabaseGuideModal.tsx # Skema SQL & Koneksi Supabase
│   ├── 📁 data/
│   │   └── mockData.ts          # Seed Awal DPT, Kandidat, & Periode
│   ├── 📁 services/
│   │   ├── storage.ts           # Engine Dual-Mode (Supabase Cloud + Fallback)
│   │   ├── supabaseClient.ts    # Inisialisasi @supabase/supabase-js SDK
│   │   └── supabaseSchema.ts    # SQL Skrip DDL + RLS + Stored Procedure
│   ├── 📁 types/
│   │   └── index.ts             # Definisi Tipe TypeScript
│   ├── App.tsx                  # Root Container & Router View
│   ├── index.css                # Tailwind CSS v4 & Styling Cetak Kartu
│   └── main.tsx                 # Entry Point
├── supabase_schema.sql          # File SQL Murni untuk Supabase SQL Editor
├── vercel.json                  # Konfigurasi Deploy Vercel SPA
├── .env.example                 # VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
└── package.json
`;
