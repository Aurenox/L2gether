import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  Globe,
  Sparkles,
  ExternalLink,
  Type,
  FileCode,
  Copy,
  Check,
  Languages,
  Layers,
  ArrowRight,
  Eye,
  Code,
  X,
  Play,
  RefreshCw,
  LayoutTemplate
} from 'lucide-react';
import api from '../../services/api';
import SectionHelpButton from '../common/SectionHelpButton';
import {
  ENGLISH_GOOGLE_FONTS,
  getFontDemoSnippet,
  ICON_LIBRARY_REFS,
  CDN_TEMPLATES
} from '../../utils/cdnTemplates';

// Curated 35+ Font Awesome 6 Icons
const FONT_AWESOME_ICONS = [
  { name: 'House / Home', class: 'fa-solid fa-house', tag: '<i class="fa-solid fa-house"></i>', cat: 'Common' },
  { name: 'User / Profile', class: 'fa-solid fa-user', tag: '<i class="fa-solid fa-user"></i>', cat: 'Common' },
  { name: 'Search', class: 'fa-solid fa-magnifying-glass', tag: '<i class="fa-solid fa-magnifying-glass"></i>', cat: 'Common' },
  { name: 'Heart', class: 'fa-solid fa-heart', tag: '<i class="fa-solid fa-heart"></i>', cat: 'Common' },
  { name: 'Star', class: 'fa-solid fa-star', tag: '<i class="fa-solid fa-star"></i>', cat: 'Common' },
  { name: 'Envelope / Mail', class: 'fa-solid fa-envelope', tag: '<i class="fa-solid fa-envelope"></i>', cat: 'Communication' },
  { name: 'Gear / Settings', class: 'fa-solid fa-gear', tag: '<i class="fa-solid fa-gear"></i>', cat: 'System' },
  { name: 'Trash / Delete', class: 'fa-solid fa-trash', tag: '<i class="fa-solid fa-trash"></i>', cat: 'System' },
  { name: 'Check / Success', class: 'fa-solid fa-check', tag: '<i class="fa-solid fa-check"></i>', cat: 'Feedback' },
  { name: 'X-Mark / Close', class: 'fa-solid fa-xmark', tag: '<i class="fa-solid fa-xmark"></i>', cat: 'Feedback' },
  { name: 'Bars / Menu', class: 'fa-solid fa-bars', tag: '<i class="fa-solid fa-bars"></i>', cat: 'Navigation' },
  { name: 'Bell / Alert', class: 'fa-solid fa-bell', tag: '<i class="fa-solid fa-bell"></i>', cat: 'Feedback' },
  { name: 'Code', class: 'fa-solid fa-code', tag: '<i class="fa-solid fa-code"></i>', cat: 'Dev' },
  { name: 'Terminal', class: 'fa-solid fa-terminal', tag: '<i class="fa-solid fa-terminal"></i>', cat: 'Dev' },
  { name: 'Share', class: 'fa-solid fa-share-nodes', tag: '<i class="fa-solid fa-share-nodes"></i>', cat: 'Social' },
  { name: 'Download', class: 'fa-solid fa-download', tag: '<i class="fa-solid fa-download"></i>', cat: 'Files' },
  { name: 'Upload', class: 'fa-solid fa-upload', tag: '<i class="fa-solid fa-upload"></i>', cat: 'Files' },
  { name: 'Eye / View', class: 'fa-solid fa-eye', tag: '<i class="fa-solid fa-eye"></i>', cat: 'Common' },
  { name: 'Lock', class: 'fa-solid fa-lock', tag: '<i class="fa-solid fa-lock"></i>', cat: 'Security' },
  { name: 'Unlock', class: 'fa-solid fa-lock-open', tag: '<i class="fa-solid fa-lock-open"></i>', cat: 'Security' },
  { name: 'Camera', class: 'fa-solid fa-camera', tag: '<i class="fa-solid fa-camera"></i>', cat: 'Media' },
  { name: 'Video', class: 'fa-solid fa-video', tag: '<i class="fa-solid fa-video"></i>', cat: 'Media' },
  { name: 'Music', class: 'fa-solid fa-music', tag: '<i class="fa-solid fa-music"></i>', cat: 'Media' },
  { name: 'Folder', class: 'fa-solid fa-folder', tag: '<i class="fa-solid fa-folder"></i>', cat: 'Files' },
  { name: 'File', class: 'fa-solid fa-file', tag: '<i class="fa-solid fa-file"></i>', cat: 'Files' },
  { name: 'Bug', class: 'fa-solid fa-bug', tag: '<i class="fa-solid fa-bug"></i>', cat: 'Dev' },
  { name: 'Shield', class: 'fa-solid fa-shield-halved', tag: '<i class="fa-solid fa-shield-halved"></i>', cat: 'Security' },
  { name: 'Play', class: 'fa-solid fa-play', tag: '<i class="fa-solid fa-play"></i>', cat: 'Media' },
  { name: 'Pause', class: 'fa-solid fa-pause', tag: '<i class="fa-solid fa-pause"></i>', cat: 'Media' },
  { name: 'Compass', class: 'fa-solid fa-compass', tag: '<i class="fa-solid fa-compass"></i>', cat: 'Navigation' },
  { name: 'Location', class: 'fa-solid fa-location-dot', tag: '<i class="fa-solid fa-location-dot"></i>', cat: 'Navigation' },
  { name: 'Globe', class: 'fa-solid fa-globe', tag: '<i class="fa-solid fa-globe"></i>', cat: 'Common' },
  { name: 'Wifi', class: 'fa-solid fa-wifi', tag: '<i class="fa-solid fa-wifi"></i>', cat: 'System' },
  { name: 'GitHub', class: 'fa-brands fa-github', tag: '<i class="fa-brands fa-github"></i>', cat: 'Brands' },
  { name: 'Twitter / X', class: 'fa-brands fa-twitter', tag: '<i class="fa-brands fa-twitter"></i>', cat: 'Brands' },
  { name: 'LinkedIn', class: 'fa-brands fa-linkedin', tag: '<i class="fa-brands fa-linkedin"></i>', cat: 'Brands' },
  { name: 'Sparkles', class: 'fa-solid fa-wand-magic-sparkles', tag: '<i class="fa-solid fa-wand-magic-sparkles"></i>', cat: 'Special' }
];

// Curated 35+ Google Material Symbols
const MATERIAL_SYMBOLS_ICONS = [
  { name: 'Home', glyph: 'home', tag: '<span class="material-symbols-outlined">home</span>', cat: 'Common' },
  { name: 'Search', glyph: 'search', tag: '<span class="material-symbols-outlined">search</span>', cat: 'Common' },
  { name: 'Settings', glyph: 'settings', tag: '<span class="material-symbols-outlined">settings</span>', cat: 'System' },
  { name: 'Favorite / Heart', glyph: 'favorite', tag: '<span class="material-symbols-outlined">favorite</span>', cat: 'Common' },
  { name: 'Person / User', glyph: 'person', tag: '<span class="material-symbols-outlined">person</span>', cat: 'Common' },
  { name: 'Check Circle', glyph: 'check_circle', tag: '<span class="material-symbols-outlined">check_circle</span>', cat: 'Feedback' },
  { name: 'Cancel / Close', glyph: 'cancel', tag: '<span class="material-symbols-outlined">cancel</span>', cat: 'Feedback' },
  { name: 'Menu', glyph: 'menu', tag: '<span class="material-symbols-outlined">menu</span>', cat: 'Navigation' },
  { name: 'Notifications', glyph: 'notifications', tag: '<span class="material-symbols-outlined">notifications</span>', cat: 'Feedback' },
  { name: 'Mail', glyph: 'mail', tag: '<span class="material-symbols-outlined">mail</span>', cat: 'Communication' },
  { name: 'Code', glyph: 'code', tag: '<span class="material-symbols-outlined">code</span>', cat: 'Dev' },
  { name: 'Terminal', glyph: 'terminal', tag: '<span class="material-symbols-outlined">terminal</span>', cat: 'Dev' },
  { name: 'Share', glyph: 'share', tag: '<span class="material-symbols-outlined">share</span>', cat: 'Social' },
  { name: 'Download', glyph: 'download', tag: '<span class="material-symbols-outlined">download</span>', cat: 'Files' },
  { name: 'Upload', glyph: 'upload', tag: '<span class="material-symbols-outlined">upload</span>', cat: 'Files' },
  { name: 'Visibility / Eye', glyph: 'visibility', tag: '<span class="material-symbols-outlined">visibility</span>', cat: 'Common' },
  { name: 'Lock', glyph: 'lock', tag: '<span class="material-symbols-outlined">lock</span>', cat: 'Security' },
  { name: 'Lock Open', glyph: 'lock_open', tag: '<span class="material-symbols-outlined">lock_open</span>', cat: 'Security' },
  { name: 'Photo Camera', glyph: 'photo_camera', tag: '<span class="material-symbols-outlined">photo_camera</span>', cat: 'Media' },
  { name: 'Videocam', glyph: 'videocam', tag: '<span class="material-symbols-outlined">videocam</span>', cat: 'Media' },
  { name: 'Volume Up', glyph: 'volume_up', tag: '<span class="material-symbols-outlined">volume_up</span>', cat: 'Media' },
  { name: 'Folder', glyph: 'folder', tag: '<span class="material-symbols-outlined">folder</span>', cat: 'Files' },
  { name: 'Description / File', glyph: 'description', tag: '<span class="material-symbols-outlined">description</span>', cat: 'Files' },
  { name: 'Bug Report', glyph: 'bug_report', tag: '<span class="material-symbols-outlined">bug_report</span>', cat: 'Dev' },
  { name: 'Shield', glyph: 'shield', tag: '<span class="material-symbols-outlined">shield</span>', cat: 'Security' },
  { name: 'Play Arrow', glyph: 'play_arrow', tag: '<span class="material-symbols-outlined">play_arrow</span>', cat: 'Media' },
  { name: 'Pause', glyph: 'pause', tag: '<span class="material-symbols-outlined">pause</span>', cat: 'Media' },
  { name: 'Explore', glyph: 'explore', tag: '<span class="material-symbols-outlined">explore</span>', cat: 'Navigation' },
  { name: 'Location On', glyph: 'location_on', tag: '<span class="material-symbols-outlined">location_on</span>', cat: 'Navigation' },
  { name: 'Language / Globe', glyph: 'language', tag: '<span class="material-symbols-outlined">language</span>', cat: 'Common' },
  { name: 'Wifi', glyph: 'wifi', tag: '<span class="material-symbols-outlined">wifi</span>', cat: 'System' },
  { name: 'Shopping Cart', glyph: 'shopping_cart', tag: '<span class="material-symbols-outlined">shopping_cart</span>', cat: 'Commerce' },
  { name: 'Edit / Pencil', glyph: 'edit', tag: '<span class="material-symbols-outlined">edit</span>', cat: 'Common' },
  { name: 'Delete', glyph: 'delete', tag: '<span class="material-symbols-outlined">delete</span>', cat: 'System' },
  { name: 'Auto Awesome / Sparkles', glyph: 'auto_awesome', tag: '<span class="material-symbols-outlined">auto_awesome</span>', cat: 'Special' }
];

// Curated 35+ Bootstrap Icons
const BOOTSTRAP_ICONS = [
  { name: 'House / Home', class: 'bi bi-house', tag: '<i class="bi bi-house"></i>', cat: 'Common' },
  { name: 'Search', class: 'bi bi-search', tag: '<i class="bi bi-search"></i>', cat: 'Common' },
  { name: 'Gear / Settings', class: 'bi bi-gear', tag: '<i class="bi bi-gear"></i>', cat: 'System' },
  { name: 'Heart', class: 'bi bi-heart', tag: '<i class="bi bi-heart"></i>', cat: 'Common' },
  { name: 'Person / User', class: 'bi bi-person', tag: '<i class="bi bi-person"></i>', cat: 'Common' },
  { name: 'Check Circle', class: 'bi bi-check-circle', tag: '<i class="bi bi-check-circle"></i>', cat: 'Feedback' },
  { name: 'X-Circle / Close', class: 'bi bi-x-circle', tag: '<i class="bi bi-x-circle"></i>', cat: 'Feedback' },
  { name: 'List / Menu', class: 'bi bi-list', tag: '<i class="bi bi-list"></i>', cat: 'Navigation' },
  { name: 'Bell / Alert', class: 'bi bi-bell', tag: '<i class="bi bi-bell"></i>', cat: 'Feedback' },
  { name: 'Envelope / Mail', class: 'bi bi-envelope', tag: '<i class="bi bi-envelope"></i>', cat: 'Communication' },
  { name: 'Code Slash', class: 'bi bi-code-slash', tag: '<i class="bi bi-code-slash"></i>', cat: 'Dev' },
  { name: 'Terminal', class: 'bi bi-terminal', tag: '<i class="bi bi-terminal"></i>', cat: 'Dev' },
  { name: 'Share', class: 'bi bi-share', tag: '<i class="bi bi-share"></i>', cat: 'Social' },
  { name: 'Download', class: 'bi bi-download', tag: '<i class="bi bi-download"></i>', cat: 'Files' },
  { name: 'Upload', class: 'bi bi-upload', tag: '<i class="bi bi-upload"></i>', cat: 'Files' },
  { name: 'Eye / View', class: 'bi bi-eye', tag: '<i class="bi bi-eye"></i>', cat: 'Common' },
  { name: 'Lock', class: 'bi bi-lock', tag: '<i class="bi bi-lock"></i>', cat: 'Security' },
  { name: 'Unlock', class: 'bi bi-unlock', tag: '<i class="bi bi-unlock"></i>', cat: 'Security' },
  { name: 'Camera', class: 'bi bi-camera', tag: '<i class="bi bi-camera"></i>', cat: 'Media' },
  { name: 'Camera Video', class: 'bi bi-camera-video', tag: '<i class="bi bi-camera-video"></i>', cat: 'Media' },
  { name: 'Volume Up', class: 'bi bi-volume-up', tag: '<i class="bi bi-volume-up"></i>', cat: 'Media' },
  { name: 'Folder', class: 'bi bi-folder', tag: '<i class="bi bi-folder"></i>', cat: 'Files' },
  { name: 'File Earmark', class: 'bi bi-file-earmark', tag: '<i class="bi bi-file-earmark"></i>', cat: 'Files' },
  { name: 'Bug', class: 'bi bi-bug', tag: '<i class="bi bi-bug"></i>', cat: 'Dev' },
  { name: 'Shield Check', class: 'bi bi-shield-check', tag: '<i class="bi bi-shield-check"></i>', cat: 'Security' },
  { name: 'Play', class: 'bi bi-play', tag: '<i class="bi bi-play"></i>', cat: 'Media' },
  { name: 'Pause', class: 'bi bi-pause', tag: '<i class="bi bi-pause"></i>', cat: 'Media' },
  { name: 'Compass', class: 'bi bi-compass', tag: '<i class="bi bi-compass"></i>', cat: 'Navigation' },
  { name: 'Geo Alt / Location', class: 'bi bi-geo-alt', tag: '<i class="bi bi-geo-alt"></i>', cat: 'Navigation' },
  { name: 'Globe', class: 'bi bi-globe', tag: '<i class="bi bi-globe"></i>', cat: 'Common' },
  { name: 'Wifi', class: 'bi bi-wifi', tag: '<i class="bi bi-wifi"></i>', cat: 'System' },
  { name: 'Cart / Shop', class: 'bi bi-cart', tag: '<i class="bi bi-cart"></i>', cat: 'Commerce' },
  { name: 'Pencil / Edit', class: 'bi bi-pencil', tag: '<i class="bi bi-pencil"></i>', cat: 'Common' },
  { name: 'Trash', class: 'bi bi-trash', tag: '<i class="bi bi-trash"></i>', cat: 'System' },
  { name: 'GitHub', class: 'bi bi-github', tag: '<i class="bi bi-github"></i>', cat: 'Brands' },
  { name: 'Bootstrap', class: 'bi bi-bootstrap', tag: '<i class="bi bi-bootstrap"></i>', cat: 'Brands' }
];

export default function PackageManagerPanel({ roomId, files = [], onSwitchTab, onFilesUpdated }) {
  // Navigation Tabs: 'cdn', 'fonts', 'icons', 'installed'
  const [activeTab, setActiveTab] = useState('cdn');
  const [iconSubTab, setIconSubTab] = useState('fontawesome'); // 'fontawesome', 'material', 'bootstrap'
  const [fontLibraryMode, setFontLibraryMode] = useState('english'); // 'english' (35+ popular) or 'multilingual' (30+ languages)

  const [catalog, setCatalog] = useState([]);
  const [googleFontsCatalog, setGoogleFontsCatalog] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [installingPkg, setInstallingPkg] = useState(null);
  const [installLog, setInstallLog] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState('');

  // Target Workspace File for 1-Click Injection
  const workspaceFileOptions = useMemo(() => {
    const list = (files || []).filter((f) => !f.is_directory && !f.isDirectory).map((f) => f.path);
    if (!list.includes('index.html') && list.length === 0) {
      return ['index.html'];
    }
    return list;
  }, [files]);

  const [selectedTargetFile, setSelectedTargetFile] = useState(() => {
    return workspaceFileOptions.includes('index.html') ? 'index.html' : workspaceFileOptions[0] || 'index.html';
  });

  useEffect(() => {
    if (workspaceFileOptions.length > 0 && !workspaceFileOptions.includes(selectedTargetFile)) {
      setSelectedTargetFile(workspaceFileOptions.includes('index.html') ? 'index.html' : workspaceFileOptions[0]);
    }
  }, [workspaceFileOptions, selectedTargetFile]);

  // Google Fonts Studio State
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedFonts, setSelectedFonts] = useState(['Inter', 'JetBrains Mono']);
  const [previewText, setPreviewText] = useState('');
  const [importingFonts, setImportingFonts] = useState(false);

  // Modals for Code Demo, Reference Icons, and 10 CDN Templates
  const [previewFontModal, setPreviewFontModal] = useState(null); // font object
  const [fontModalTab, setFontModalTab] = useState('preview'); // 'preview', 'code', 'link', 'css'
  const [previewIconDemoModal, setPreviewIconDemoModal] = useState(null); // 'fontawesome', 'material', 'bootstrap'
  const [iconModalTab, setIconModalTab] = useState('preview'); // 'preview', 'code'
  const [cdnTemplatesModal, setCdnTemplatesModal] = useState(null); // { cdnName, templates, activeIdx, viewMode }

  // Custom package installer
  const [customPkgName, setCustomPkgName] = useState('');
  const [customPkgEnv, setCustomPkgEnv] = useState('npm');
  const [installingCustom, setInstallingCustom] = useState(false);
  const [uninstallingPkg, setUninstallingPkg] = useState(null);

  // Load package catalog and installed list
  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, instRes] = await Promise.all([
        api.getPackageCatalog(roomId),
        api.getInstalledPackages(roomId)
      ]);
      setCatalog(catRes.catalog || []);
      if (Array.isArray(catRes.googleFonts) && catRes.googleFonts.length > 0) {
        setGoogleFontsCatalog(catRes.googleFonts);
      }
      setInstalled(instRes.dependencies || []);
    } catch (e) {
      console.error('Failed to load package data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) {
      loadData();
    }
  }, [roomId]);

  // Dynamically load Google Fonts & Icon Stylesheets into DOM head for live visual preview in studio
  useEffect(() => {
    const links = [
      { id: 'l2gether-preview-fa', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' },
      { id: 'l2gether-preview-ms', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0' },
      { id: 'l2gether-preview-bi', href: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css' },
      { id: 'l2gether-preview-english-fonts', href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@400;700&family=Dancing+Script:wght@400;700&family=Fira+Code:wght@400;600&family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&family=Lato:wght@300;400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:wght@300;400;700&family=Montserrat:wght@300;400;600;700;800&family=Open+Sans:wght@300;400;600;700&family=Oswald:wght@400;600&family=Outfit:wght@400;600&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;600;700&family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;600&family=Roboto+Slab:wght@400;700&family=Rubik:wght@400;600&family=Source+Code+Pro:wght@400;600&family=Space+Grotesk:wght@400;600&family=Work+Sans:wght@400;600&display=swap' },
      { id: 'l2gether-preview-fonts', href: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Baloo+Tamma+2:wght@400;700&family=Be+Vietnam+Pro:wght@400;600&family=Cairo:wght@400;700&family=Fira+Sans:wght@400;600&family=Gotu&family=Heebo:wght@400;700&family=Hind+Siliguri:wght@400;600&family=Kalam:wght@400;700&family=Kanit:wght@400;600&family=Manjari:wght@400;700&family=Mukta+Malar:wght@400;600&family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Armenian:wght@400;700&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+Ethiopic:wght@400;700&family=Noto+Sans+Georgian:wght@400;700&family=Noto+Sans+Greek:wght@400;700&family=Noto+Sans+Gurmukhi:wght@400;700&family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+KR:wght@400;700&family=Noto+Sans+Khmer:wght@400;700&family=Noto+Sans+Myanmar:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+Sinhala:wght@400;700&family=Noto+Sans+TC:wght@400;700&family=Ramabhadra&family=Shrikhand&family=Vazirmatn:wght@400;700&display=swap' }
    ];
    for (const l of links) {
      if (!document.getElementById(l.id)) {
        const el = document.createElement('link');
        el.id = l.id;
        el.rel = 'stylesheet';
        el.href = l.href;
        document.head.appendChild(el);
      }
    }
  }, []);

  // Install package or CDN into user-selected target file
  const handleInstall = async (pkg) => {
    try {
      setInstallingPkg(pkg.name);
      setInstallLog(`Injecting ${pkg.name} into ${selectedTargetFile}...`);

      await api.installPackage(roomId, {
        packageName: pkg.name,
        version: pkg.version || 'latest',
        environment: pkg.env,
        targetFile: selectedTargetFile
      });

      setInstallLog(`✓ Successfully injected ${pkg.name} into ${selectedTargetFile} (Workspace auto-refreshed).`);
      await loadData();
      await onFilesUpdated?.(selectedTargetFile);
    } catch (e) {
      setInstallLog(`✕ Failed to inject ${pkg.name}: ${e.message}`);
    } finally {
      setInstallingPkg(null);
    }
  };

  const handleUninstall = async (depOrPkg) => {
    const pkgName = depOrPkg.package_name || depOrPkg.name;
    const environment = depOrPkg.environment || depOrPkg.env;
    try {
      setUninstallingPkg(`${environment}-${pkgName}`);
      setInstallLog(`Removing ${pkgName} (${environment})...`);
      await api.uninstallPackage(roomId, {
        packageName: pkgName,
        environment: environment,
        targetFile: selectedTargetFile
      });
      setInstallLog(`✓ Successfully removed ${pkgName} from ${selectedTargetFile} (Workspace auto-refreshed).`);
      await loadData();
      await onFilesUpdated?.(selectedTargetFile);
    } catch (e) {
      setInstallLog(`✕ Failed to remove ${pkgName}: ${e.message}`);
    } finally {
      setUninstallingPkg(null);
    }
  };

  const handleInstallCustom = async (e) => {
    if (e) e.preventDefault();
    const trimmed = customPkgName.trim();
    if (!trimmed) return;

    try {
      setInstallingCustom(true);
      setInstallLog(`Installing custom package '${trimmed}' (${customPkgEnv})...`);

      await api.installPackage(roomId, {
        packageName: trimmed,
        version: 'latest',
        environment: customPkgEnv,
        targetFile: selectedTargetFile
      });

      setInstallLog(`✓ Successfully installed '${trimmed}' into ${customPkgEnv === 'pip' ? 'requirements.txt' : 'package.json'} (Workspace auto-refreshed).`);
      setCustomPkgName('');
      await loadData();
      await onFilesUpdated?.(customPkgEnv === 'pip' ? 'requirements.txt' : 'package.json');
    } catch (e) {
      setInstallLog(`✕ Failed to install '${trimmed}': ${e.message}`);
    } finally {
      setInstallingCustom(false);
    }
  };

  const handleToggleFontSelection = (fontName) => {
    setSelectedFonts((prev) =>
      prev.includes(fontName) ? prev.filter((f) => f !== fontName) : [...prev, fontName]
    );
  };

  const handleImportFonts = async (fontsToImport) => {
    const list = Array.isArray(fontsToImport) ? fontsToImport : selectedFonts;
    if (list.length === 0) return;
    try {
      setImportingFonts(true);
      setInstallLog(`Importing ${list.join(', ')} into ${selectedTargetFile} and styles.css...`);
      await api.importGoogleFonts(roomId, list, selectedTargetFile);
      setInstallLog(`✓ Successfully imported Google Fonts: ${list.join(', ')} into ${selectedTargetFile} (Workspace auto-refreshed).`);
      await loadData();
      await onFilesUpdated?.(selectedTargetFile);
    } catch (e) {
      setInstallLog(`✕ Font import failed: ${e.message}`);
    } finally {
      setImportingFonts(false);
    }
  };

  // 1-Click Inject Template Code directly into user-selected workspace file
  const handleInjectTemplateCode = async (code, targetFile) => {
    const target = targetFile || selectedTargetFile || 'index.html';
    try {
      setInstallLog(`Injecting template code into ${target}...`);
      await api.saveWorkspaceFile(roomId, {
        path: target,
        content: code
      });
      setInstallLog(`✓ Successfully injected template into ${target}! Workspace and live preview auto-refreshed.`);
      await loadData();
      await onFilesUpdated?.(target);
    } catch (e) {
      setInstallLog(`✕ Failed to inject template: ${e.message}`);
    }
  };

  const handleCopySnippet = (snippet, id) => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(''), 2200);
  };

  const isInstalled = (pkgName, env) => {
    const norm = pkgName.toLowerCase().replace(/\s*\(cdn\)$/i, '').trim();
    return installed.some(
      (d) =>
        d.environment === env &&
        (d.package_name.toLowerCase() === pkgName.toLowerCase() ||
          d.package_name.toLowerCase().replace(/\s*\(cdn\)$/i, '').trim() === norm)
    );
  };

  // Google Fonts Filtering
  const languageOptions = useMemo(() => {
    const set = new Set();
    for (const f of googleFontsCatalog) {
      if (f.language) set.add(f.language);
    }
    return ['All', ...Array.from(set).sort()];
  }, [googleFontsCatalog]);

  const filteredEnglishFonts = useMemo(() => {
    if (!searchQuery.trim()) return ENGLISH_GOOGLE_FONTS;
    const q = searchQuery.toLowerCase();
    return ENGLISH_GOOGLE_FONTS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredMultilingualFonts = useMemo(() => {
    let list = googleFontsCatalog;
    if (selectedLanguage !== 'All') {
      list = list.filter((f) => f.language === selectedLanguage);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.language && f.language.toLowerCase().includes(q)) ||
          (f.category && f.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [googleFontsCatalog, selectedLanguage, searchQuery]);

  // Pure Web CDN list
  const cdnList = catalog.filter((p) => p.env === 'cdn' && p.category !== 'Font Icons');

  const filteredCdns = useMemo(() => {
    if (!searchQuery.trim()) return cdnList;
    const q = searchQuery.toLowerCase();
    return cdnList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [cdnList, searchQuery]);

  // Current Icon Set for Icons Tab
  const currentIconSet = useMemo(() => {
    if (iconSubTab === 'fontawesome') {
      return {
        id: 'fontawesome',
        name: 'Font Awesome 6 (CDN)',
        list: FONT_AWESOME_ICONS,
        cdn: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
        ref: ICON_LIBRARY_REFS.fontawesome
      };
    }
    if (iconSubTab === 'material') {
      return {
        id: 'material',
        name: 'Google Material Symbols (CDN)',
        list: MATERIAL_SYMBOLS_ICONS,
        cdn: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">',
        ref: ICON_LIBRARY_REFS.material
      };
    }
    return {
      id: 'bootstrap',
      name: 'Bootstrap Icons (CDN)',
      list: BOOTSTRAP_ICONS,
      cdn: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">',
      ref: ICON_LIBRARY_REFS.bootstrap
    };
  }, [iconSubTab]);

  const filteredIcons = useMemo(() => {
    if (!iconSearchQuery.trim()) return currentIconSet.list;
    const q = iconSearchQuery.toLowerCase();
    return currentIconSet.list.filter(
      (ic) =>
        ic.name.toLowerCase().includes(q) ||
        (ic.glyph && ic.glyph.includes(q)) ||
        (ic.class && ic.class.includes(q))
    );
  }, [currentIconSet, iconSearchQuery]);

  return (
    <div className="packages-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="packages-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={22} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Smart Package Manager Hub</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                110 CDN Templates (10/CDN), English Google Fonts Studio &amp; 30+ Font Icons
              </span>
            </div>
          </div>

          {/* Target Workspace File Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <FileCode size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Inject Target:</span>
            <select
              value={selectedTargetFile}
              onChange={(e) => setSelectedTargetFile(e.target.value)}
              className="form-input"
              style={{
                height: '26px',
                fontSize: '0.75rem',
                padding: '0 6px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontWeight: 600
              }}
              title="Select which workspace file to inject links, scripts, or templates into"
            >
              {workspaceFileOptions.map((path) => (
                <option key={path} value={path}>
                  {path} {path === 'index.html' ? '(default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveTab('installed')}
              className={`badge ${activeTab === 'installed' ? 'badge-primary' : 'badge-secondary'}`}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.65rem' }}
              title="View installed packages"
            >
              <CheckCircle2 size={12} />
              <span>{installed.length} Injected</span>
            </button>

            <SectionHelpButton
              title="Package Hub Help"
              description="One-click CDN package injection, Google Fonts, font icon toolkits, and library templates."
              tips={[
                "Target File: Choose which workspace HTML file receives injected stylesheets and script tags.",
                "1-Click CDN Injection: Instantly inject Bootstrap, Tailwind, React, Lucide, FontAwesome, or Chart.js.",
                "Google Fonts Studio: Preview and inject typography stylesheets directly into your document.",
                "Library Templates: Complete ready-to-run demo snippets to copy or insert directly into your code."
              ]}
              align="right"
            />
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0.3rem 0', WebkitOverflowScrolling: 'touch' }}>
          <button
            className={`btn btn-sm ${activeTab === 'cdn' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('cdn')}
            style={{ fontSize: '0.75rem' }}
          >
            <Globe size={13} />
            <span>CDNs &amp; 110 Templates</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'fonts' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('fonts')}
            style={{ fontSize: '0.75rem' }}
          >
            <Type size={13} />
            <span>Google Fonts (35+ English &amp; Multilingual)</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'icons' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('icons')}
            style={{ fontSize: '0.75rem' }}
          >
            <Sparkles size={13} />
            <span>Font Icons (30+ Icons &amp; CDN Demos)</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'installed' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('installed')}
            style={{ fontSize: '0.75rem' }}
          >
            <CheckCircle2 size={13} />
            <span>Injected ({installed.length})</span>
          </button>
        </div>

        {/* Status / Log Notification */}
        {installLog && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{installLog}</span>
            <button className="btn-icon sm btn-subtle" onClick={() => setInstallLog('')}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {/* ============================================================== */}
        {/* TAB 1: CDNs & 10 Variant Templates per Section */}
        {/* ============================================================== */}
        {activeTab === 'cdn' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Web CDN Libraries &amp; Ready-to-Use Templates</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Each CDN includes <strong>10 beginner templates</strong> with live preview &amp; 1-click injection into <code>{selectedTargetFile}</code>.
                </p>
              </div>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search CDNs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '28px', fontSize: '0.78rem', height: '30px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredCdns.map((pkg) => {
                const installedAlready = isInstalled(pkg.name, pkg.env);
                const isCurrentInstalling = installingPkg === pkg.name;
                const templatesAvailable = CDN_TEMPLATES[pkg.name] || [];

                return (
                  <div key={pkg.name} className="package-card" style={{ padding: '0.85rem 1rem' }}>
                    <div className="package-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <Globe size={16} color="var(--accent-secondary)" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{pkg.name}</h4>
                        <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>v{pkg.version}</span>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{pkg.category}</span>

                        {templatesAvailable.length > 0 && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38BDF8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              fontSize: '0.65rem',
                              fontWeight: 700
                            }}
                          >
                            ⭐ 10 Ready Templates
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {pkg.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        {pkg.docsUrl && (
                          <a
                            href={pkg.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              color: 'var(--accent-primary)',
                              textDecoration: 'none'
                            }}
                          >
                            <span>Official Docs</span>
                            <ExternalLink size={11} />
                          </a>
                        )}

                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ fontSize: '0.7rem', padding: '1px 6px', height: '22px' }}
                          onClick={() => handleCopySnippet(pkg.cdnSnippet, pkg.name)}
                          title="Copy CDN HTML tag"
                        >
                          {copiedSnippet === pkg.name ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedSnippet === pkg.name ? 'Copied' : 'Copy HTML Tag'}</span>
                        </button>

                        {/* 10 Varied Templates Modal Button */}
                        {templatesAvailable.length > 0 && (
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              height: '24px',
                              backgroundColor: '#1E293B',
                              color: '#38BDF8',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() =>
                              setCdnTemplatesModal({
                                cdnName: pkg.name,
                                templates: templatesAvailable,
                                activeIdx: 0,
                                viewMode: 'preview'
                              })
                            }
                            title="Explore 10 varied beginner templates for this CDN"
                          >
                            <LayoutTemplate size={12} />
                            <span>10 Templates ({templatesAvailable.length})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {installedAlready ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge badge-success" style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}>
                            <CheckCircle2 size={13} />
                            Injected
                          </span>
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.3rem 0.6rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                            disabled={uninstallingPkg === `${pkg.env}-${pkg.name}`}
                            onClick={() => handleUninstall(pkg)}
                            title={`Remove from ${selectedTargetFile}`}
                          >
                            <Trash2 size={12} />
                            <span>{uninstallingPkg === `${pkg.env}-${pkg.name}` ? 'Removing...' : 'Remove'}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isCurrentInstalling}
                          onClick={() => handleInstall(pkg)}
                          title={`Inject CDN tag into ${selectedTargetFile}`}
                        >
                          <Download size={13} />
                          <span>{isCurrentInstalling ? 'Injecting...' : `Inject into ${selectedTargetFile}`}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: Google Fonts Studio (English & Multilingual) */}
        {/* ============================================================== */}
        {activeTab === 'fonts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Type size={16} color="var(--accent-primary)" />
                  Google Fonts Studio (35+ English &amp; Multilingual)
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  View live typography, copy code demos, and inject fonts into <code>{selectedTargetFile}</code> &amp; <code>styles.css</code>.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={selectedFonts.length === 0 || importingFonts}
                  onClick={() => handleImportFonts(selectedFonts)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={13} />
                  <span>{importingFonts ? 'Importing...' : `Inject (${selectedFonts.length}) into ${selectedTargetFile}`}</span>
                </button>
              </div>
            </div>

            {/* Mode Switcher: Popular English vs Multilingual */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <button
                className={`btn btn-sm ${fontLibraryMode === 'english' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFontLibraryMode('english')}
                style={{ fontSize: '0.78rem' }}
              >
                <span>⭐ Popular English Fonts (35+)</span>
              </button>
              <button
                className={`btn btn-sm ${fontLibraryMode === 'multilingual' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFontLibraryMode('multilingual')}
                style={{ fontSize: '0.78rem' }}
              >
                <span>🌍 Global Multilingual (30+ Languages)</span>
              </button>
            </div>

            {/* Language Filter & Live Text Input Toolbar */}
            <div
              style={{
                display: 'flex',
                gap: '0.65rem',
                backgroundColor: 'var(--bg-secondary)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              {/* If multilingual mode: show Language Filter */}
              {fontLibraryMode === 'multilingual' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Languages size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Filter Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="form-input"
                    style={{ height: '30px', fontSize: '0.78rem', padding: '0 6px', width: '160px' }}
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang} {lang === 'All' ? `(${googleFontsCatalog.length} fonts)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Preview Text Customizer */}
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Type custom text to preview typography in real time..."
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="form-input"
                  style={{ height: '30px', fontSize: '0.78rem', width: '100%' }}
                />
              </div>

              {/* Search Font */}
              <div style={{ position: 'relative', width: '170px' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search fonts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '26px', fontSize: '0.75rem', height: '30px' }}
                />
              </div>
            </div>

            {/* Google Fonts Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '0.85rem' }}>
              {(fontLibraryMode === 'english' ? filteredEnglishFonts : filteredMultilingualFonts).map((font) => {
                const isSelected = selectedFonts.includes(font.name);

                return (
                  <div
                    key={font.name}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{font.name}</span>
                          <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>
                            {font.language || font.category}
                          </span>
                          {font.weights && (
                            <span className="badge badge-secondary" style={{ marginLeft: '4px', fontSize: '0.62rem' }}>
                              {font.weights}
                            </span>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleFontSelection(font.name)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          title="Select this font for batch injection"
                        />
                      </div>

                      {font.description && (
                        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {font.description}
                        </p>
                      )}

                      {/* Live Visual Typography Preview */}
                      <div
                        style={{
                          fontFamily: font.cssFamily,
                          fontSize: '1.25rem',
                          color: 'var(--text-main)',
                          padding: '0.6rem 0',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                          minHeight: '52px'
                        }}
                      >
                        {previewText || font.sampleText || font.name}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* View Code Demo Modal Trigger */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 8px', height: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            setPreviewFontModal(font);
                            setFontModalTab('preview');
                          }}
                          title="View live demo and HTML code for beginners"
                        >
                          <Eye size={11} />
                          <span>View Code Demo</span>
                        </button>

                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ padding: '1px 6px', fontSize: '0.68rem', height: '22px' }}
                          onClick={() => handleCopySnippet(font.htmlTag || `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}&display=swap" rel="stylesheet">`, `${font.name}-tag`)}
                          title="Copy HTML <link> tag"
                        >
                          {copiedSnippet === `${font.name}-tag` ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedSnippet === `${font.name}-tag` ? 'Copied' : 'Tag'}</span>
                        </button>

                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ padding: '1px 6px', fontSize: '0.68rem', height: '22px' }}
                          onClick={() => handleCopySnippet(`font-family: ${font.cssFamily};`, `${font.name}-css`)}
                          title="Copy CSS snippet"
                        >
                          {copiedSnippet === `${font.name}-css` ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedSnippet === `${font.name}-css` ? 'Copied' : 'CSS'}</span>
                        </button>
                      </div>

                      <button
                        className="btn btn-subtle btn-sm"
                        style={{ fontSize: '0.68rem', padding: '1px 6px', height: '22px', color: 'var(--accent-primary)' }}
                        onClick={() => handleImportFonts([font.name])}
                        title={`Inject ${font.name} directly into ${selectedTargetFile}`}
                      >
                        <Download size={11} />
                        <span>Inject &lt;head&gt;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: Font Icons (Font Awesome, Material Symbols, Bootstrap Icons) */}
        {/* ============================================================== */}
        {activeTab === 'icons' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600 }}>
                Vector &amp; Font Icon Libraries (30+ Icons, CDN Links &amp; Beginners Demos)
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                1-click copy classes, HTML tags, explore code demos, and inject CDN links into <code>{selectedTargetFile}</code>.
              </p>
            </div>

            {/* Sub-Tabs for Icon Systems */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button
                className={`btn btn-sm ${iconSubTab === 'fontawesome' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIconSubTab('fontawesome')}
                style={{ fontSize: '0.78rem' }}
              >
                <span>Font Awesome 6 (35+ Icons)</span>
              </button>
              <button
                className={`btn btn-sm ${iconSubTab === 'material' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIconSubTab('material')}
                style={{ fontSize: '0.78rem' }}
              >
                <span>Google Material Symbols (35+ Icons)</span>
              </button>
              <button
                className={`btn btn-sm ${iconSubTab === 'bootstrap' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIconSubTab('bootstrap')}
                style={{ fontSize: '0.78rem' }}
              >
                <span>Bootstrap Icons (35+ Icons)</span>
              </button>
            </div>

            {/* Current Icon Library CDN & Reference Demo Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                  <Sparkles size={16} color="var(--accent-primary)" />
                  <strong style={{ fontSize: '0.95rem' }}>{currentIconSet.name}</strong>
                  {isInstalled(currentIconSet.name, 'cdn') ? (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Injected</span>
                  ) : (
                    <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>CDN Ready</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {currentIconSet.cdn}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* View Beginner Starter Template Modal */}
                {currentIconSet.ref && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setPreviewIconDemoModal(currentIconSet.id);
                      setIconModalTab('preview');
                    }}
                    style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="View beginner starter code template with live preview"
                  >
                    <Eye size={12} />
                    <span>View Beginner Demo</span>
                  </button>
                )}

                <button
                  className="btn btn-subtle btn-sm"
                  onClick={() => handleCopySnippet(currentIconSet.cdn, currentIconSet.name)}
                >
                  {copiedSnippet === currentIconSet.name ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedSnippet === currentIconSet.name ? 'Copied' : 'Copy CDN <link>'}</span>
                </button>

                {isInstalled(currentIconSet.name, 'cdn') ? (
                  <button
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#F87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                    disabled={uninstallingPkg === `cdn-${currentIconSet.name}`}
                    onClick={() => handleUninstall({ name: currentIconSet.name, env: 'cdn' })}
                  >
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={installingPkg === currentIconSet.name}
                    onClick={() => handleInstall({ name: currentIconSet.name, env: 'cdn', version: 'latest' })}
                  >
                    <Download size={13} />
                    <span>Inject CDN into {selectedTargetFile}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Icon Search */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Interactive Icon Explorer ({filteredIcons.length} icons - Copy class or HTML tag)
              </span>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={iconSearchQuery}
                  onChange={(e) => setIconSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '28px', fontSize: '0.78rem', height: '30px' }}
                />
              </div>
            </div>

            {/* Interactive Icon Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '0.65rem'
              }}
            >
              {filteredIcons.map((ic) => {
                const isTagCopied = copiedSnippet === ic.tag;
                const isClassCopied = copiedSnippet === (ic.class || ic.glyph);

                return (
                  <div
                    key={ic.tag}
                    style={{
                      backgroundColor: isTagCopied || isClassCopied ? 'var(--bg-active)' : 'var(--bg-card)',
                      border: isTagCopied || isClassCopied ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                      textAlign: 'center'
                    }}
                  >
                    {/* Visual Glyph Display */}
                    <div
                      onClick={() => handleCopySnippet(ic.tag, ic.tag)}
                      style={{
                        fontSize: '1.6rem',
                        color: isTagCopied ? 'var(--accent-primary)' : 'var(--text-main)',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Click icon to copy HTML tag"
                    >
                      {iconSubTab === 'fontawesome' && <i className={ic.class}></i>}
                      {iconSubTab === 'material' && <span className="material-symbols-outlined">{ic.glyph}</span>}
                      {iconSubTab === 'bootstrap' && <i className={ic.class}></i>}
                    </div>

                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.2' }}>
                      {ic.name}
                    </div>

                    {/* Class Name display */}
                    <code style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {ic.class || ic.glyph}
                    </code>

                    {/* Beginner Copy Buttons */}
                    <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '2px' }}>
                      <button
                        className="btn btn-subtle btn-sm"
                        style={{ flex: 1, fontSize: '0.65rem', padding: '1px 4px', height: '22px' }}
                        onClick={() => handleCopySnippet(ic.class || ic.glyph, ic.class || ic.glyph)}
                        title="Copy CSS class only"
                      >
                        {isClassCopied ? <Check size={10} /> : <Copy size={10} />}
                        <span>{isClassCopied ? 'Copied' : 'Class'}</span>
                      </button>

                      <button
                        className="btn btn-subtle btn-sm"
                        style={{ flex: 1, fontSize: '0.65rem', padding: '1px 4px', height: '22px' }}
                        onClick={() => handleCopySnippet(ic.tag, ic.tag)}
                        title="Copy full HTML <i> or <span> tag"
                      >
                        {isTagCopied ? <Check size={10} /> : <Copy size={10} />}
                        <span>{isTagCopied ? 'Copied' : 'Tag'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: Active Injected Workspace Dependencies */}
        {/* ============================================================== */}
        {activeTab === 'installed' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Active Injected Workspace Dependencies ({installed.length})</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  All packages, CDNs, and libraries currently registered in this workspace. Remove any dependency with 1-click.
                </p>
              </div>
            </div>

            {/* Quick Install Bar */}
            <form
              onSubmit={handleInstallCustom}
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                backgroundColor: 'var(--bg-secondary)',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <Package size={16} color="var(--accent-primary)" />
              <input
                type="text"
                placeholder="Install any package (e.g. axios, bootstrap, lodash, lucide)..."
                value={customPkgName}
                onChange={(e) => setCustomPkgName(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '180px', height: '32px', fontSize: '0.8rem' }}
              />
              <select
                value={customPkgEnv}
                onChange={(e) => setCustomPkgEnv(e.target.value)}
                className="form-input"
                style={{ width: '90px', height: '32px', fontSize: '0.8rem', padding: '0 6px' }}
              >
                <option value="npm">npm (Node)</option>
                <option value="pip">pip (Python)</option>
              </select>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!customPkgName.trim() || installingCustom}
                style={{ height: '32px', padding: '0 0.85rem', whiteSpace: 'nowrap' }}
              >
                <Download size={13} />
                <span>{installingCustom ? 'Installing...' : 'Install Package'}</span>
              </button>
            </form>

            {installed.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)'
                }}
              >
                <Package size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                <h5 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>No packages injected yet</h5>
                <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Browse the CDNs &amp; Web, Google Fonts, or Font Icons tabs to inject libraries into this workspace.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('cdn')}>
                    <Globe size={13} />
                    <span>Browse CDNs</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('fonts')}>
                    <Type size={13} />
                    <span>Browse Fonts</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('icons')}>
                    <Sparkles size={13} />
                    <span>Browse Icons</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {installed.map((dep) => {
                  const isRemoving = uninstallingPkg === `${dep.environment}-${dep.package_name}`;

                  return (
                    <div
                      key={`${dep.environment}-${dep.package_name}`}
                      className="package-card"
                      style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-card)' }}
                    >
                      <div className="package-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                          <Globe size={16} color="var(--accent-secondary)" />
                          <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{dep.package_name}</h4>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                            {dep.version || 'latest'}
                          </span>
                          <span className="badge badge-primary" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                            {dep.environment}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Target: {dep.environment === 'cdn' ? selectedTargetFile : dep.environment === 'pip' ? 'requirements.txt' : 'package.json'}
                          {dep.installed_at ? ` • Added ${new Date(dep.installed_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>

                      <div>
                        <button
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.35rem 0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#F87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                          disabled={isRemoving}
                          onClick={() => handleUninstall(dep)}
                          title={`Remove ${dep.package_name} from workspace`}
                        >
                          <Trash2 size={13} />
                          <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: Google Font View Code Demo Modal */}
      {/* ============================================================== */}
      {previewFontModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setPreviewFontModal(null)}
        >
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Type size={18} color="#38BDF8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    {previewFontModal.name} — HTML &amp; CSS Code Demo
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    {previewFontModal.category} • {previewFontModal.weights || 'Regular, Bold'}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-subtle btn-icon sm"
                onClick={() => setPreviewFontModal(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 1.25rem', backgroundColor: '#090D16', borderBottom: '1px solid #1E293B' }}>
              <button
                className={`btn btn-sm ${fontModalTab === 'preview' ? 'btn-primary' : 'btn-subtle'}`}
                onClick={() => setFontModalTab('preview')}
                style={{ fontSize: '0.75rem' }}
              >
                <Eye size={12} />
                <span>Live Typography Preview</span>
              </button>
              <button
                className={`btn btn-sm ${fontModalTab === 'code' ? 'btn-primary' : 'btn-subtle'}`}
                onClick={() => setFontModalTab('code')}
                style={{ fontSize: '0.75rem' }}
              >
                <Code size={12} />
                <span>Complete HTML Template</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {fontModalTab === 'preview' ? (
                <>
                  {/* Live Render Area */}
                  <div
                    style={{
                      backgroundColor: '#161B26',
                      border: '1px solid #293142',
                      borderRadius: '10px',
                      padding: '1.5rem',
                      fontFamily: previewFontModal.cssFamily,
                      color: '#F8FAFC'
                    }}
                  >
                    <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#38BDF8' }}>
                      {previewFontModal.name}
                    </div>
                    <div style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                      {previewText || previewFontModal.sampleText || 'The quick brown fox jumps over the lazy dog.'}
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#94A3B8', margin: 0 }}>
                      {previewFontModal.description}
                    </p>
                  </div>

                  {/* HTML Tag Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38BDF8' }}>1. HTML &lt;head&gt; Tag:</span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ fontSize: '0.7rem', height: '22px' }}
                          onClick={() => handleCopySnippet(previewFontModal.htmlTag || `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(previewFontModal.name)}&display=swap" rel="stylesheet">`, 'modal-font-tag')}
                        >
                          {copiedSnippet === 'modal-font-tag' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedSnippet === 'modal-font-tag' ? 'Copied' : 'Copy HTML Tag'}</span>
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.7rem', height: '22px' }}
                          onClick={() => handleImportFonts([previewFontModal.name])}
                        >
                          <Download size={11} />
                          <span>Inject into {selectedTargetFile}</span>
                        </button>
                      </div>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        backgroundColor: '#090D16',
                        border: '1px solid #1E293B',
                        borderRadius: '6px',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.72rem',
                        color: '#E2E8F0',
                        overflowX: 'auto',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {previewFontModal.htmlTag || `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(previewFontModal.name)}&display=swap" rel="stylesheet">`}
                    </pre>
                  </div>

                  {/* CSS Rule Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38BDF8' }}>2. CSS font-family rule:</span>
                      <button
                        className="btn btn-subtle btn-sm"
                        style={{ fontSize: '0.7rem', height: '22px' }}
                        onClick={() => handleCopySnippet(`font-family: ${previewFontModal.cssFamily};`, 'modal-font-css')}
                      >
                        {copiedSnippet === 'modal-font-css' ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedSnippet === 'modal-font-css' ? 'Copied' : 'Copy CSS'}</span>
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        backgroundColor: '#090D16',
                        border: '1px solid #1E293B',
                        borderRadius: '6px',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.75rem',
                        color: '#A78BFA',
                        overflowX: 'auto',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      font-family: {previewFontModal.cssFamily};
                    </pre>
                  </div>
                </>
              ) : (
                /* Complete Starter Demo Template */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                      Complete standalone HTML file ready for beginners:
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCopySnippet(getFontDemoSnippet(previewFontModal), 'modal-full-demo')}
                      >
                        {copiedSnippet === 'modal-full-demo' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedSnippet === 'modal-full-demo' ? 'Copied' : 'Copy Complete Demo'}</span>
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleInjectTemplateCode(getFontDemoSnippet(previewFontModal), selectedTargetFile)}
                      >
                        <Download size={12} />
                        <span>1-Click Inject into {selectedTargetFile}</span>
                      </button>
                    </div>
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      backgroundColor: '#090D16',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      padding: '1rem',
                      fontSize: '0.75rem',
                      color: '#E2E8F0',
                      overflowX: 'auto',
                      maxHeight: '440px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {getFontDemoSnippet(previewFontModal)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Icon Starter Demo Modal (Reference for Beginners) */}
      {/* ============================================================== */}
      {previewIconDemoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setPreviewIconDemoModal(null)}
        >
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sparkles size={18} color="#38BDF8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    {ICON_LIBRARY_REFS[previewIconDemoModal]?.name} — Beginner Reference Template
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Complete HTML demo showing how to include the CDN and use icon tags
                  </span>
                </div>
              </div>

              <button
                className="btn btn-subtle btn-icon sm"
                onClick={() => setPreviewIconDemoModal(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Subtabs */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 1.25rem', backgroundColor: '#090D16', borderBottom: '1px solid #1E293B' }}>
              <button
                className={`btn btn-sm ${iconModalTab === 'preview' ? 'btn-primary' : 'btn-subtle'}`}
                onClick={() => setIconModalTab('preview')}
                style={{ fontSize: '0.75rem' }}
              >
                <Eye size={12} />
                <span>Live Demo View</span>
              </button>
              <button
                className={`btn btn-sm ${iconModalTab === 'code' ? 'btn-primary' : 'btn-subtle'}`}
                onClick={() => setIconModalTab('code')}
                style={{ fontSize: '0.75rem' }}
              >
                <Code size={12} />
                <span>Source Code</span>
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Target File: <code>{selectedTargetFile}</code>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopySnippet(ICON_LIBRARY_REFS[previewIconDemoModal]?.demoCode, 'icon-demo-copy')}
                  >
                    {copiedSnippet === 'icon-demo-copy' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === 'icon-demo-copy' ? 'Copied' : 'Copy Template'}</span>
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleInjectTemplateCode(ICON_LIBRARY_REFS[previewIconDemoModal]?.demoCode, selectedTargetFile)}
                  >
                    <Download size={12} />
                    <span>1-Click Inject into {selectedTargetFile}</span>
                  </button>
                </div>
              </div>

              {iconModalTab === 'preview' ? (
                <iframe
                  title="Icon Demo Preview"
                  srcDoc={ICON_LIBRARY_REFS[previewIconDemoModal]?.demoCode}
                  style={{
                    width: '100%',
                    height: '400px',
                    backgroundColor: '#0B0D12',
                    border: '1px solid #1E293B',
                    borderRadius: '8px'
                  }}
                  sandbox="allow-scripts"
                />
              ) : (
                <pre
                  style={{
                    margin: 0,
                    backgroundColor: '#090D16',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '1rem',
                    fontSize: '0.75rem',
                    color: '#E2E8F0',
                    overflowX: 'auto',
                    maxHeight: '420px',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {ICON_LIBRARY_REFS[previewIconDemoModal]?.demoCode}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: 10 Varied Templates Modal per CDN (110 Templates Total) */}
      {/* ============================================================== */}
      {cdnTemplatesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={() => setCdnTemplatesModal(null)}
        >
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '980px',
              height: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#090D16' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <LayoutTemplate size={18} color="#38BDF8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    {cdnTemplatesModal.cdnName} — 10 Beginner Templates
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    No need to visit external documentation! 10 complete copy-paste &amp; 1-click inject templates.
                  </span>
                </div>
              </div>

              <button
                className="btn btn-subtle btn-icon sm"
                onClick={() => setCdnTemplatesModal(null)}
                title="Close Templates"
              >
                <X size={16} />
              </button>
            </div>

            {/* Template Selector Ribbon (1 to 10) */}
            <div
              style={{
                display: 'flex',
                gap: '0.35rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#0F172A',
                borderBottom: '1px solid #1E293B',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}
            >
              {cdnTemplatesModal.templates.map((tpl, idx) => {
                const isActive = cdnTemplatesModal.activeIdx === idx;
                return (
                  <button
                    key={tpl.id || idx}
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}
                    onClick={() =>
                      setCdnTemplatesModal((prev) => ({ ...prev, activeIdx: idx }))
                    }
                  >
                    <span>{idx + 1}. {tpl.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Template Area */}
            {(() => {
              const currentTpl = cdnTemplatesModal.templates[cdnTemplatesModal.activeIdx] || cdnTemplatesModal.templates[0];
              if (!currentTpl) return null;

              return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Template Meta Bar */}
                  <div style={{ padding: '0.65rem 1.25rem', backgroundColor: '#161B26', borderBottom: '1px solid #293142', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: '#F8FAFC' }}>
                        {cdnTemplatesModal.activeIdx + 1}. {currentTpl.title}
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8' }}>
                        {currentTpl.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* View Mode Toggle: Preview vs Code */}
                      <div style={{ display: 'flex', gap: '2px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px', borderRadius: '4px' }}>
                        <button
                          className={`btn btn-sm ${cdnTemplatesModal.viewMode === 'preview' ? 'btn-secondary' : 'btn-subtle'}`}
                          style={{ fontSize: '0.7rem', padding: '2px 8px', height: '24px' }}
                          onClick={() => setCdnTemplatesModal((prev) => ({ ...prev, viewMode: 'preview' }))}
                        >
                          <Eye size={11} />
                          <span>Live Preview</span>
                        </button>
                        <button
                          className={`btn btn-sm ${cdnTemplatesModal.viewMode === 'code' ? 'btn-secondary' : 'btn-subtle'}`}
                          style={{ fontSize: '0.7rem', padding: '2px 8px', height: '24px' }}
                          onClick={() => setCdnTemplatesModal((prev) => ({ ...prev, viewMode: 'code' }))}
                        >
                          <Code size={11} />
                          <span>Source Code</span>
                        </button>
                      </div>

                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', height: '26px' }}
                        onClick={() => handleCopySnippet(currentTpl.code, `cdn-tpl-${currentTpl.id}`)}
                      >
                        {copiedSnippet === `cdn-tpl-${currentTpl.id}` ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedSnippet === `cdn-tpl-${currentTpl.id}` ? 'Copied' : 'Copy Code'}</span>
                      </button>

                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.72rem', height: '26px' }}
                        onClick={() => handleInjectTemplateCode(currentTpl.code, selectedTargetFile)}
                        title={`Inject this template directly into ${selectedTargetFile}`}
                      >
                        <Download size={12} />
                        <span>Inject into {selectedTargetFile}</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Viewer */}
                  <div style={{ flex: 1, overflow: 'hidden', padding: '0.75rem' }}>
                    {cdnTemplatesModal.viewMode === 'preview' ? (
                      <iframe
                        key={`${cdnTemplatesModal.activeIdx}-${currentTpl.id}`}
                        title={currentTpl.title}
                        srcDoc={currentTpl.code}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: '1px solid #1E293B',
                          borderRadius: '8px',
                          backgroundColor: '#0B0D12'
                        }}
                        sandbox="allow-scripts allow-modals"
                      />
                    ) : (
                      <pre
                        style={{
                          margin: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#090D16',
                          border: '1px solid #1E293B',
                          borderRadius: '8px',
                          padding: '1rem',
                          fontSize: '0.75rem',
                          color: '#E2E8F0',
                          overflow: 'auto',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {currentTpl.code}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
