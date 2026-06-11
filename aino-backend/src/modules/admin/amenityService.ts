import prisma from '../../config/database';

export interface AmenityDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  isBuiltIn: boolean;
}

const SETTINGS_KEY = 'custom_amenities';

export const BUILTIN_AMENITIES: AmenityDef[] = [
  { key: 'water',        label: 'Water Supply',          icon: 'droplet',       color: '#3b82f6', isBuiltIn: true },
  { key: 'electricity',  label: 'Electricity',           icon: 'zap',           color: '#f59e0b', isBuiltIn: true },
  { key: 'drainage',     label: 'Underground Drainage',  icon: 'wind',          color: '#8b5cf6', isBuiltIn: true },
  { key: 'streetLights', label: 'Street Lights',         icon: 'sun',           color: '#f97316', isBuiltIn: true },
  { key: 'compoundWall', label: 'Compound Wall',         icon: 'square',        color: '#64748b', isBuiltIn: true },
  { key: 'park',         label: 'Park Area',             icon: 'triangle',      color: '#16a34a', isBuiltIn: true },
  { key: 'clubhouse',    label: 'Clubhouse',             icon: 'home',          color: '#0ea5e9', isBuiltIn: true },
  { key: 'security',     label: '24/7 Security',         icon: 'shield',        color: '#ef4444', isBuiltIn: true },
];

const getCustom = async (): Promise<Omit<AmenityDef, 'isBuiltIn'>[]> => {
  const setting = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } });
  if (!setting) return [];
  try { return JSON.parse(setting.value) as Omit<AmenityDef, 'isBuiltIn'>[]; } catch { return []; }
};

const saveCustom = (list: Omit<AmenityDef, 'isBuiltIn'>[]) =>
  prisma.settings.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(list) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(list) },
  });

const labelToKey = (label: string): string =>
  label.trim()
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/\s/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());

export const getAllAmenities = async (): Promise<AmenityDef[]> => {
  const custom = await getCustom();
  return [
    ...BUILTIN_AMENITIES,
    ...custom.map((a) => ({ ...a, isBuiltIn: false })),
  ];
};

export const addCustomAmenity = async (label: string, icon: string, color: string): Promise<AmenityDef> => {
  const key = labelToKey(label);
  if (!key) throw new Error('Label produces an empty key');

  const builtIn = BUILTIN_AMENITIES.find((a) => a.key === key);
  if (builtIn) throw new Error('Conflicts with a built-in amenity');

  const custom = await getCustom();
  if (custom.find((a) => a.key === key)) throw new Error('An amenity with this name already exists');

  custom.push({ key, label: label.trim(), icon, color });
  await saveCustom(custom);
  return { key, label: label.trim(), icon, color, isBuiltIn: false };
};

export const deleteCustomAmenity = async (key: string): Promise<void> => {
  if (BUILTIN_AMENITIES.find((a) => a.key === key)) {
    throw new Error('Cannot delete a built-in amenity');
  }
  const custom = await getCustom();
  await saveCustom(custom.filter((a) => a.key !== key));
};
