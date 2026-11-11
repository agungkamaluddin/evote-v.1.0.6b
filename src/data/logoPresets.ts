/**
 * Preset Logos for E-Voting OSIS / OSIM
 * Contains high-definition vector data URIs and default emblem
 */

export interface LogoPreset {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  category: 'OSIS' | 'OSIM' | 'UMUM';
}

export const LOGO_PRESETS: LogoPreset[] = [
  {
    id: 'school-default',
    name: 'Emblem E-Voting Sekolah',
    subtitle: 'Logo digital voting resmi sekolah & madrasah',
    url: '/assets/images/school_emblem_logo_1793677969399.jpg',
    category: 'UMUM',
  },
  {
    id: 'osis-nasional',
    name: 'Lambang OSIS Nasional',
    subtitle: 'Logo resmi OSIS Kemendikbudristek (SMA / SMK / SMP)',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='60' cy='60' r='56' fill='%231e293b' stroke='%23f59e0b' stroke-width='4'/><path d='M60 16 L76 34 L98 34 L88 54 L98 74 L76 74 L60 92 L44 74 L22 74 L32 54 L22 34 L44 34 Z' fill='%23f59e0b'/><path d='M60 26 L70 38 L86 38 L78 54 L86 70 L70 70 L60 82 L50 70 L34 70 L42 54 L34 38 L50 38 Z' fill='%23b45309'/><circle cx='60' cy='54' r='18' fill='%23ffffff'/><path d='M50 56 L60 44 L70 56 L65 56 L60 50 L55 56 Z' fill='%230f172a'/><text x='60' y='108' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='900' font-size='11' letter-spacing='2'>OSIS</text></svg>",
    category: 'OSIS',
  },
  {
    id: 'osim-madrasah',
    name: 'Lambang OSIM Madrasah',
    subtitle: 'Logo resmi OSIM Kementerian Agama (MA / MTs)',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='60' cy='60' r='56' fill='%23064e3b' stroke='%2334d399' stroke-width='4'/><circle cx='60' cy='60' r='46' fill='%23047857'/><path d='M60 22 C76 22 88 34 88 50 C88 66 74 78 60 78 C46 78 32 66 32 50 C32 34 44 22 60 22 Z' fill='%23ffffff'/><circle cx='60' cy='48' r='18' fill='%23064e3b'/><polygon points='60,34 63,43 72,43 65,49 68,58 60,52 52,58 55,49 48,43 57,43' fill='%23fbbf24'/><text x='60' y='104' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='900' font-size='12' letter-spacing='2'>OSIM</text><text x='60' y='114' text-anchor='middle' fill='%23a7f3d0' font-family='sans-serif' font-weight='bold' font-size='7'>MADRASAH</text></svg>",
    category: 'OSIM',
  },
  {
    id: 'tut-wuri',
    name: 'Tut Wuri Handayani',
    subtitle: 'Lambang Pendidikan Nasional Indonesia',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><circle cx='60' cy='60' r='56' fill='%231d4ed8' stroke='%2393c5fd' stroke-width='4'/><polygon points='60,20 95,45 82,88 38,88 25,45' fill='%23fbbf24' stroke='%23ffffff' stroke-width='2'/><circle cx='60' cy='52' r='14' fill='%23ffffff'/><path d='M44 76 Q60 62 76 76 Q60 84 44 76 Z' fill='%23ffffff'/><text x='60' y='108' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='900' font-size='9' letter-spacing='1'>TUT WURI</text></svg>",
    category: 'UMUM',
  },
];
