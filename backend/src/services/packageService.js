import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

// Popular curated catalog of Web CDNs and frontend utility libraries
export const PACKAGE_CATALOG = [
  // CSS & UI Frameworks (CDN)
  {
    name: 'Bootstrap 5 (CDN)',
    version: '5.3.3',
    env: 'cdn',
    category: 'CSS Framework',
    description: 'World’s most popular frontend open source toolkit with responsive grid and components.',
    cdnSnippet: '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">\n<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>',
    docsUrl: 'https://getbootstrap.com/docs/5.3/'
  },
  {
    name: 'Tailwind CSS (CDN)',
    version: '3.4.17',
    env: 'cdn',
    category: 'CSS Framework',
    description: 'Utility-first CSS framework injected directly into HTML via browser play CDN.',
    cdnSnippet: '<script src="https://cdn.tailwindcss.com"></script>',
    docsUrl: 'https://tailwindcss.com/docs'
  },
  {
    name: 'jQuery (CDN)',
    version: '3.7.1',
    env: 'cdn',
    category: 'DOM Utility',
    description: 'Fast, small, and feature-rich JavaScript DOM manipulation library.',
    cdnSnippet: '<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>',
    docsUrl: 'https://api.jquery.com/'
  },
  {
    name: 'Axios (CDN)',
    version: '1.7.9',
    env: 'cdn',
    category: 'Networking',
    description: 'Promise-based HTTP client for the browser via jsDelivr CDN.',
    cdnSnippet: '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>',
    docsUrl: 'https://axios-http.com/docs/intro'
  },

  // Font Icons (CDN)
  {
    name: 'Font Awesome 6 (CDN)',
    version: '6.5.1',
    env: 'cdn',
    category: 'Font Icons',
    description: 'The web’s most popular icon set with 30+ ready-to-use vector icons.',
    cdnSnippet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
    docsUrl: 'https://fontawesome.com/icons'
  },
  {
    name: 'Google Material Symbols (CDN)',
    version: 'latest',
    env: 'cdn',
    category: 'Font Icons',
    description: 'Google’s official variable icon font with 30+ Outlined, Rounded, and Sharp glyphs.',
    cdnSnippet: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">',
    docsUrl: 'https://fonts.google.com/icons'
  },
  {
    name: 'Bootstrap Icons (CDN)',
    version: '1.11.3',
    env: 'cdn',
    category: 'Font Icons',
    description: 'Free, high quality, open source icon library with over 2,000 icons.',
    cdnSnippet: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">',
    docsUrl: 'https://icons.getbootstrap.com/'
  },

  // Interactive Graphics, Visuals & Helpers
  {
    name: 'Three.js (CDN)',
    version: 'r128',
    env: 'cdn',
    category: '3D Graphics',
    description: '3D WebGL graphics engine loaded via Cloudflare CDN script tag.',
    cdnSnippet: '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
    docsUrl: 'https://threejs.org/docs/'
  },
  {
    name: 'Chart.js (CDN)',
    version: '4.4.7',
    env: 'cdn',
    category: 'Charts',
    description: 'HTML5 canvas charts loaded via jsDelivr CDN script tag.',
    cdnSnippet: '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
    docsUrl: 'https://www.chartjs.org/docs/'
  },
  {
    name: 'Animate.css (CDN)',
    version: '4.1.1',
    env: 'cdn',
    category: 'Animation',
    description: 'A cross-browser library of CSS animations ready for instant web use.',
    cdnSnippet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>',
    docsUrl: 'https://animate.style/'
  },
  {
    name: 'Vue.js 3 (CDN)',
    version: '3.4.21',
    env: 'cdn',
    category: 'Frontend Framework',
    description: 'Progressive JavaScript framework for building user interfaces.',
    cdnSnippet: '<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>',
    docsUrl: 'https://vuejs.org/'
  },
  {
    name: 'Alpine.js (CDN)',
    version: '3.13.5',
    env: 'cdn',
    category: 'Micro Framework',
    description: 'Rugged, minimal tool for composing behavior directly in markup.',
    cdnSnippet: '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>',
    docsUrl: 'https://alpinejs.dev/'
  },
  {
    name: 'SweetAlert2 (CDN)',
    version: '11.10.6',
    env: 'cdn',
    category: 'UI Components',
    description: 'A beautiful, responsive, customizable replacement for JavaScript popup boxes.',
    cdnSnippet: '<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>',
    docsUrl: 'https://sweetalert2.github.io/'
  },
  {
    name: 'Canvas Confetti (CDN)',
    version: '1.9.2',
    env: 'cdn',
    category: 'Visual Effects',
    description: 'High-performance confetti animations for celebrations and feedback.',
    cdnSnippet: '<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>',
    docsUrl: 'https://www.npmjs.com/package/canvas-confetti'
  }
];

// Curated Google Fonts supporting 35+ major world languages and scripts
export const GOOGLE_FONTS_CATALOG = [
  // 1. English / Global Latin
  { name: 'Inter', language: 'English / Latin', category: 'Sans-Serif', weights: '300,400,500,600,700', cssFamily: "'Inter', sans-serif", sampleText: 'The quick brown fox jumps over the lazy code' },
  { name: 'Roboto', language: 'Global Latin', category: 'Sans-Serif', weights: '300,400,500,700', cssFamily: "'Roboto', sans-serif", sampleText: 'Precision typography engineered for modern web apps' },
  { name: 'Outfit', language: 'Display / Latin', category: 'Geometric Sans', weights: '300,400,600,700', cssFamily: "'Outfit', sans-serif", sampleText: 'One link. Everything together in real-time.' },
  { name: 'Playfair Display', language: 'Editorial / Latin', category: 'Serif', weights: '400,600,700', cssFamily: "'Playfair Display', serif", sampleText: 'Crafted with elegance and timeless distinction' },
  { name: 'JetBrains Mono', language: 'Code / Monospace', category: 'Monospace', weights: '400,500,700', cssFamily: "'JetBrains Mono', monospace", sampleText: 'const l2gether = async () => compile({ c, python });' },

  // 2. Spanish / European Latin
  { name: 'Open Sans', language: 'Spanish', category: 'Sans-Serif', weights: '300,400,600,700', cssFamily: "'Open Sans', sans-serif", sampleText: 'El veloz murciélago hindú comía feliz cardillo y kiwi' },

  // 3. French
  { name: 'Montserrat', language: 'French', category: 'Sans-Serif', weights: '300,400,600,700', cssFamily: "'Montserrat', sans-serif", sampleText: 'Voix ambiguë d’un cœur qui, au zéphyr, préfère les jattes' },

  // 4. German
  { name: 'Lato', language: 'German', category: 'Sans-Serif', weights: '300,400,700', cssFamily: "'Lato', sans-serif", sampleText: 'Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich' },

  // 5. Hindi / Devanagari
  { name: 'Noto Sans Devanagari', language: 'Hindi', category: 'Devanagari', weights: '400,500,600,700', cssFamily: "'Noto Sans Devanagari', sans-serif", sampleText: 'सभी मनुष्य जन्म से स्वतंत्र तथा समान हैं' },
  { name: 'Kalam', language: 'Hindi', category: 'Handwriting', weights: '300,400,700', cssFamily: "'Kalam', cursive", sampleText: 'नमस्ते भारत! रचनात्मक कोडिंग और सहयोग' },

  // 6. Arabic
  { name: 'Cairo', language: 'Arabic', category: 'Arabic Sans', weights: '300,400,600,700', cssFamily: "'Cairo', sans-serif", sampleText: 'يولد جميع الناس أحراراً ومتساوين في الكرامة والحقوق' },
  { name: 'Amiri', language: 'Arabic', category: 'Arabic Serif', weights: '400,700', cssFamily: "'Amiri', serif", sampleText: 'السلام عليكم ورحمة الله وبركاته' },

  // 7. Bengali / Bangla
  { name: 'Hind Siliguri', language: 'Bengali', category: 'Bengali Sans', weights: '300,400,500,600,700', cssFamily: "'Hind Siliguri', sans-serif", sampleText: 'সমস্ত মানুষ স্বাধীনভাবে সমান মর্যাদা নিয়ে জন্মগ্রহণ করে' },

  // 8. Japanese
  { name: 'Noto Sans JP', language: 'Japanese', category: 'Japanese Sans', weights: '300,400,500,700', cssFamily: "'Noto Sans JP', sans-serif", sampleText: 'すべての人間は、生まれながらにして自由であり' },

  // 9. Chinese Simplified
  { name: 'Noto Sans SC', language: 'Chinese (Simplified)', category: 'Simplified Chinese', weights: '300,400,500,700', cssFamily: "'Noto Sans SC', sans-serif", sampleText: '人人生而自由，在尊严和权利上一律平等' },

  // 10. Chinese Traditional
  { name: 'Noto Sans TC', language: 'Chinese (Traditional)', category: 'Traditional Chinese', weights: '300,400,500,700', cssFamily: "'Noto Sans TC', sans-serif", sampleText: '人皆生而自由；在尊嚴及權利上均各平等' },

  // 11. Korean
  { name: 'Noto Sans KR', language: 'Korean', category: 'Korean Sans', weights: '300,400,500,700', cssFamily: "'Noto Sans KR', sans-serif", sampleText: '모든 인간은 태어날 때부터 자유로우며 존엄합니다' },

  // 12. Russian / Cyrillic
  { name: 'Fira Sans', language: 'Russian', category: 'Cyrillic Sans', weights: '300,400,500,700', cssFamily: "'Fira Sans', sans-serif", sampleText: 'Все люди рождаются свободными и равными' },

  // 13. Greek
  { name: 'Noto Sans Greek', language: 'Greek', category: 'Greek Sans', weights: '300,400,600,700', cssFamily: "'Noto Sans Greek', sans-serif", sampleText: 'Όλοι οι άνθρωποι γεννιούνται ελεύθεροι και ίσοι' },

  // 14. Hebrew
  { name: 'Heebo', language: 'Hebrew', category: 'Hebrew Sans', weights: '300,400,600,700', cssFamily: "'Heebo', sans-serif", sampleText: 'כל בני אדם נולדו בני חורין ושווים' },

  // 15. Tamil
  { name: 'Mukta Malar', language: 'Tamil', category: 'Tamil Sans', weights: '300,400,600,700', cssFamily: "'Mukta Malar', sans-serif", sampleText: 'மனிதப் பிறவியினர் சகலரும் சுதந்திரமாகவே பிறக்கின்றனர்' },

  // 16. Telugu
  { name: 'Ramabhadra', language: 'Telugu', category: 'Telugu Sans', weights: '400', cssFamily: "'Ramabhadra', sans-serif", sampleText: 'ప్రతిపత్తియు స్వత్వములును సమానములుగా జన్మింతురు' },

  // 17. Kannada
  { name: 'Baloo Tamma 2', language: 'Kannada', category: 'Kannada', weights: '400,600,700', cssFamily: "'Baloo Tamma 2', cursive", sampleText: 'ಎಲ್ಲಾ ಮಾನವರೂ ಜನ್ಮತಃ ಸ್ವತಂತ್ರರೂ ಮತ್ತು ಘನತೆ' },

  // 18. Malayalam
  { name: 'Manjari', language: 'Malayalam', category: 'Malayalam', weights: '400,700', cssFamily: "'Manjari', sans-serif", sampleText: 'മനുഷ്യരെല്ലാവരും തുല്യാവകാശങ്ങളോടും ജനിക്കുന്നു' },

  // 19. Gujarati
  { name: 'Shrikhand', language: 'Gujarati', category: 'Gujarati', weights: '400', cssFamily: "'Shrikhand', cursive", sampleText: 'પ્રતિષ્ઠા અને અધિકારોની દૃષ્ટિએ સર્વ માનવો સ્વતંત્ર' },

  // 20. Thai
  { name: 'Kanit', language: 'Thai', category: 'Thai Sans', weights: '300,400,600,700', cssFamily: "'Kanit', sans-serif", sampleText: 'มนุษย์ทั้งหลายเกิดมามีอิสระและเสมอภาคกัน' },

  // 21. Vietnamese
  { name: 'Be Vietnam Pro', language: 'Vietnamese', category: 'Vietnamese', weights: '300,400,600,700', cssFamily: "'Be Vietnam Pro', sans-serif", sampleText: 'Tất cả mọi người sinh ra đều được tự do và bình đẳng' },

  // 22. Persian / Farsi
  { name: 'Vazirmatn', language: 'Persian', category: 'Persian', weights: '300,400,600,700', cssFamily: "'Vazirmatn', sans-serif", sampleText: 'همه انسان‌ها آزاد به دنیا می‌آیند و برابرند' },

  // 23. Urdu
  { name: 'Noto Nastaliq Urdu', language: 'Urdu', category: 'Urdu Nastaliq', weights: '400,700', cssFamily: "'Noto Nastaliq Urdu', serif", sampleText: 'تمام انسان آزاد اور برابر پیدا ہوئے ہیں' },

  // 24. Turkish
  { name: 'Plus Jakarta Sans', language: 'Turkish', category: 'Turkish Sans', weights: '300,400,600,700', cssFamily: "'Plus Jakarta Sans', sans-serif", sampleText: 'Bütün insanlar hür, haysiyet ve haklar bakımından eşit doğarlar' },

  // 25. Polish
  { name: 'Rubik', language: 'Polish', category: 'Central European', weights: '300,400,600,700', cssFamily: "'Rubik', sans-serif", sampleText: 'Wszyscy ludzie rodzą się wolni i równi pod względem swej godności' },

  // 26. Ukrainian
  { name: 'Cormorant Infant', language: 'Ukrainian', category: 'Cyrillic Serif', weights: '400,600,700', cssFamily: "'Cormorant Infant', serif", sampleText: 'Всі люди народжуються вільними і рівними у своїй гідності' },

  // 27. Marathi
  { name: 'Gotu', language: 'Marathi', category: 'Marathi', weights: '400', cssFamily: "'Gotu', sans-serif", sampleText: 'सर्व मानवी व्यक्ती जन्मतःच स्वतंत्र व समान असतात' },

  // 28. Punjabi / Gurmukhi
  { name: 'Noto Sans Gurmukhi', language: 'Punjabi', category: 'Gurmukhi', weights: '400,600,700', cssFamily: "'Noto Sans Gurmukhi', sans-serif", sampleText: 'ਸਾਰੇ ਮਨੁੱਖ ਆਜ਼ਾਦ ਅਤੇ ਮਾਣ-ਸਤਿਕਾਰ ਦੇ ਪੱਖ ਤੋਂ ਬਰਾਬਰ ਹਨ' },

  // 29. Khmer / Cambodian
  { name: 'Noto Sans Khmer', language: 'Khmer', category: 'Khmer', weights: '400,600,700', cssFamily: "'Noto Sans Khmer', sans-serif", sampleText: 'មនុស្សទាំងអស់កើតមកមានសេរីភាព និងស្មើភាពគ្នា' },

  // 30. Myanmar / Burmese
  { name: 'Noto Sans Myanmar', language: 'Myanmar', category: 'Burmese', weights: '400,600,700', cssFamily: "'Noto Sans Myanmar', sans-serif", sampleText: 'လူတိုင်းသည် လွတ်လပ်စွာ မွေးဖွားလာကြပြီး ဂုဏ်သိက္ခာတန်းတူရှိသည်' },

  // 31. Amharic / Ethiopic
  { name: 'Noto Sans Ethiopic', language: 'Amharic', category: 'Ethiopic', weights: '400,600,700', cssFamily: "'Noto Sans Ethiopic', sans-serif", sampleText: 'የሰው ልጆች ሁሉ ሲወለዱ ነፃና በክብርና በመብትም እኩል ናቸው' },

  // 32. Armenian
  { name: 'Noto Sans Armenian', language: 'Armenian', category: 'Armenian', weights: '400,600,700', cssFamily: "'Noto Sans Armenian', sans-serif", sampleText: 'Բոլոր մարդիկ ծնվում են ազատ ու հավասար' },

  // 33. Georgian
  { name: 'Noto Sans Georgian', language: 'Georgian', category: 'Georgian', weights: '400,600,700', cssFamily: "'Noto Sans Georgian', sans-serif", sampleText: 'ყველა ადამიანი იბადება თავისუფალი და თანასწორი' },

  // 34. Sinhala
  { name: 'Noto Sans Sinhala', language: 'Sinhala', category: 'Sinhala', weights: '400,600,700', cssFamily: "'Noto Sans Sinhala', sans-serif", sampleText: 'සියලු මනුෂ්‍යයෝ නිදහස්ව උපත ලබා ඇත' },

  // 35. Portuguese
  { name: 'Poppins', language: 'Portuguese', category: 'Geometric Sans', weights: '300,400,600,700', cssFamily: "'Poppins', sans-serif", sampleText: 'Todos os seres humanos nascem livres e iguais em dignidade' },

  // 36. Italian
  { name: 'Cinzel', language: 'Italian', category: 'Classical Serif', weights: '400,600,700', cssFamily: "'Cinzel', serif", sampleText: 'Tutti gli esseri umani nascono liberi ed eguali in dignità e diritti' },

  // 37. Swedish
  { name: 'Space Grotesk', language: 'Swedish', category: 'Modern Tech', weights: '400,500,700', cssFamily: "'Space Grotesk', sans-serif", sampleText: 'Alla människor är födda fria och lika i värde och rättigheter' },

  // 38. Filipino / Tagalog
  { name: 'Oswald', language: 'Tagalog', category: 'Condensed Display', weights: '400,600,700', cssFamily: "'Oswald', sans-serif", sampleText: 'Ang lahat ng tao ay isinilang na malaya at pantay-pantay' }
];

export async function resolveWorkspaceId(idOrRoomId) {
  if (!idOrRoomId) return null;
  const direct = await db.query(`SELECT id FROM workspaces WHERE id = $1`, [idOrRoomId]);
  if (direct.rows.length > 0) return direct.rows[0].id;
  const byRoom = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [idOrRoomId]);
  if (byRoom.rows.length > 0) return byRoom.rows[0].id;
  return idOrRoomId;
}

export async function getInstalledDependencies(workspaceIdOrRoomId) {
  const workspaceId = await resolveWorkspaceId(workspaceIdOrRoomId);
  const { rows } = await db.query(
    `SELECT id, package_name, version, environment, installed_at 
     FROM dependencies 
     WHERE workspace_id = $1 
     ORDER BY installed_at DESC`,
    [workspaceId]
  );
  return rows;
}

function findCatalogPackage(name, env) {
  if (!name) return null;
  const clean = name.toLowerCase().replace(/\s*\((cdn|npm)\)$/i, '').trim();
  const alpha = clean.replace(/[^a-z0-9]/g, '');
  return PACKAGE_CATALOG.find((p) => {
    if (env && p.env !== env) return false;
    const pClean = p.name.toLowerCase().replace(/\s*\((cdn|npm)\)$/i, '').trim();
    const pAlpha = pClean.replace(/[^a-z0-9]/g, '');
    return p.name.toLowerCase() === name.toLowerCase() || pClean === clean || pAlpha === alpha;
  });
}

export async function installPackage(workspaceIdOrRoomId, { packageName, version = 'latest', environment = 'npm', targetFile = 'index.html' }) {
  const workspaceId = await resolveWorkspaceId(workspaceIdOrRoomId);
  const catalogItem = findCatalogPackage(packageName, environment);

  const cleanVersion = version && version !== 'latest' ? version : (catalogItem?.version || '^1.0.0');
  const depId = `dep_${uuidv4().slice(0, 12)}`;

  await db.query(
    `INSERT INTO dependencies (id, workspace_id, package_name, version, environment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (workspace_id, package_name, environment) 
     DO UPDATE SET version = $4, installed_at = datetime('now')`,
    [depId, workspaceId, packageName, cleanVersion, environment]
  );

  // If CDN library, automatically inject or append into user-selected targetFile (default index.html)
  if (environment === 'cdn' && catalogItem?.cdnSnippet) {
    const targetPath = targetFile || 'index.html';
    let fileRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
      [workspaceId, targetPath]
    );
    // Fallback to index.html if selected file was not found
    if (fileRes.rows.length === 0 && targetPath !== 'index.html') {
      fileRes = await db.query(
        `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'index.html'`,
        [workspaceId]
      );
    }
    if (fileRes.rows.length > 0) {
      let content = fileRes.rows[0].content;
      if (!content.includes(catalogItem.cdnSnippet)) {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `  ${catalogItem.cdnSnippet}\n</head>`);
        } else {
          content = `${catalogItem.cdnSnippet}\n${content}`;
        }
        await db.query(
          `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
          [content, fileRes.rows[0].id]
        );
      }
    }
  }

  // If npm package, update package.json if it exists
  if (environment === 'npm') {
    const pkgRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'package.json'`,
      [workspaceId]
    );
    if (pkgRes.rows.length > 0) {
      try {
        const pkgData = JSON.parse(pkgRes.rows[0].content);
        if (!pkgData.dependencies) pkgData.dependencies = {};
        pkgData.dependencies[packageName] = cleanVersion;
        await db.query(
          `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
          [JSON.stringify(pkgData, null, 2), pkgRes.rows[0].id]
        );
      } catch (e) {}
    }
  }

  // If pip package, update or create requirements.txt in workspace
  if (environment === 'pip') {
    const reqRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'requirements.txt'`,
      [workspaceId]
    );
    let reqContent = reqRes.rows.length > 0 ? reqRes.rows[0].content : '';
    const lines = reqContent.split('\n').filter(Boolean);
    const existingIdx = lines.findIndex((l) => l.trim().toLowerCase().startsWith(packageName.toLowerCase()));
    const reqLine = `${packageName}>=${cleanVersion.replace(/^\^/, '')}`;
    if (existingIdx >= 0) {
      lines[existingIdx] = reqLine;
    } else {
      lines.push(reqLine);
    }
    const updatedReq = lines.join('\n') + '\n';
    if (reqRes.rows.length > 0) {
      await db.query(
        `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
        [updatedReq, reqRes.rows[0].id]
      );
    } else {
      const fileId = `file_${uuidv4().slice(0, 12)}`;
      await db.query(
        `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
         VALUES ($1, $2, 'requirements.txt', $3, 0, datetime('now'))`,
        [fileId, workspaceId, updatedReq]
      );
    }
  }

  const allFiles = await db.query(
    `SELECT id, path, content, is_directory, updated_at FROM workspace_files WHERE workspace_id = $1 ORDER BY path ASC`,
    [workspaceId]
  );

  return {
    success: true,
    id: depId,
    packageName,
    version: cleanVersion,
    environment,
    catalogItem,
    files: allFiles.rows
  };
}

export async function uninstallPackage(workspaceIdOrRoomId, { packageName, environment = 'npm', targetFile = 'index.html' }) {
  const workspaceId = await resolveWorkspaceId(workspaceIdOrRoomId);
  await db.query(
    `DELETE FROM dependencies 
     WHERE workspace_id = $1 AND package_name = $2 AND environment = $3`,
    [workspaceId, packageName, environment]
  );

  // If CDN library, cleanly remove from targetFile (or index.html)
  if (environment === 'cdn') {
    const catalogItem = findCatalogPackage(packageName, 'cdn');
    const targetPath = targetFile || 'index.html';
    let fileRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
      [workspaceId, targetPath]
    );
    if (fileRes.rows.length === 0 && targetPath !== 'index.html') {
      fileRes = await db.query(
        `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'index.html'`,
        [workspaceId]
      );
    }
    if (fileRes.rows.length > 0) {
      let content = fileRes.rows[0].content;
      if (catalogItem?.cdnSnippet && content.includes(catalogItem.cdnSnippet)) {
        content = content.replace(catalogItem.cdnSnippet, '').replace(/^\s*[\r\n]/gm, '');
      } else {
        const safeName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tagRegex = new RegExp(`[ \\t]*<(?:script|link)[^>]*${safeName}[^>]*>.*?(?:<\\/script>)?[ \\t]*\\r?\\n?`, 'gi');
        content = content.replace(tagRegex, '');
      }
      await db.query(
        `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
        [content, fileRes.rows[0].id]
      );
    }
  }

  // If npm package, cleanly remove from package.json
  if (environment === 'npm') {
    const pkgRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'package.json'`,
      [workspaceId]
    );
    if (pkgRes.rows.length > 0) {
      try {
        const pkgData = JSON.parse(pkgRes.rows[0].content);
        if (pkgData.dependencies && pkgData.dependencies[packageName]) {
          delete pkgData.dependencies[packageName];
          await db.query(
            `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
            [JSON.stringify(pkgData, null, 2), pkgRes.rows[0].id]
          );
        }
      } catch (e) {}
    }
  }

  // If pip package, cleanly remove from requirements.txt
  if (environment === 'pip') {
    const reqRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'requirements.txt'`,
      [workspaceId]
    );
    if (reqRes.rows.length > 0) {
      const lines = reqRes.rows[0].content.split('\n');
      const filtered = lines.filter((l) => !l.trim().toLowerCase().startsWith(packageName.toLowerCase()));
      await db.query(
        `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
        [filtered.join('\n'), reqRes.rows[0].id]
      );
    }
  }

  const allFiles = await db.query(
    `SELECT id, path, content, is_directory, updated_at FROM workspace_files WHERE workspace_id = $1 ORDER BY path ASC`,
    [workspaceId]
  );

  return { success: true, packageName, environment, files: allFiles.rows };
}

/**
 * Imports multiple selected Google Fonts into target HTML file and styles.css
 */
export async function importGoogleFonts(workspaceIdOrRoomId, fontFamilies = [], targetFile = 'index.html') {
  const workspaceId = await resolveWorkspaceId(workspaceIdOrRoomId);
  if (!fontFamilies || fontFamilies.length === 0) {
    return { success: false, message: 'No fonts selected.' };
  }

  const familyParams = fontFamilies
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&');

  const fontUrl = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
  const fontLinkSnippet = `<!-- Google Fonts: ${fontFamilies.join(', ')} -->\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${fontUrl}" rel="stylesheet">`;
  const cssImportSnippet = `/* Google Fonts Import */\n@import url('${fontUrl}');\n`;

  // 1. Inject into user-selected target file (or index.html)
  const targetPath = targetFile || 'index.html';
  let htmlRes = await db.query(
    `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
    [workspaceId, targetPath]
  );
  if (htmlRes.rows.length === 0 && targetPath !== 'index.html') {
    htmlRes = await db.query(
      `SELECT id, content FROM workspace_files WHERE workspace_id = $1 AND path = 'index.html'`,
      [workspaceId]
    );
  }
  if (htmlRes.rows.length > 0) {
    let content = htmlRes.rows[0].content;
    if (!content.includes(fontUrl)) {
      if (content.includes('</head>')) {
        content = content.replace('</head>', `  ${fontLinkSnippet}\n</head>`);
      } else {
        content = `${fontLinkSnippet}\n${content}`;
      }
      await db.query(
        `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
        [content, htmlRes.rows[0].id]
      );
    }
  }

  // 2. Inject @import into style.css or styles.css if present
  const cssRes = await db.query(
    `SELECT id, content, path FROM workspace_files WHERE workspace_id = $1 AND (path = 'style.css' OR path = 'styles.css') LIMIT 1`,
    [workspaceId]
  );
  if (cssRes.rows.length > 0) {
    let cssContent = cssRes.rows[0].content;
    if (!cssContent.includes(fontUrl)) {
      cssContent = `${cssImportSnippet}\n${cssContent}`;
      await db.query(
        `UPDATE workspace_files SET content = $1, updated_at = datetime('now') WHERE id = $2`,
        [cssContent, cssRes.rows[0].id]
      );
    }
  }

  return {
    success: true,
    fontUrl,
    fontFamilies,
    snippet: fontLinkSnippet
  };
}

export default {
  installPackage,
  uninstallPackage,
  getInstalledDependencies,
  importGoogleFonts,
  PACKAGE_CATALOG
};
