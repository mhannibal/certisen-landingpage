/**
 * Matériaux du véhicule (monochrome) et ombre de contact précalculée.
 * Tous les matériaux sont transparents pour pouvoir s'effacer au démontage ;
 * l'écriture de profondeur n'est coupée que pendant le fondu.
 */
import * as THREE from "three";

export type FadeMat = THREE.Material & { opacity: number };

/** Applique une opacité de fondu à une liste de matériaux. */
export function fade(mats: readonly FadeMat[], o: number) {
  for (const m of mats) {
    m.opacity = o;
    m.depthWrite = o > 0.95;
  }
}

/** Jeu de matériaux d'une pièce de carrosserie (chaque pièce s'efface indépendamment). */
export function bodyMaterials() {
  // Peinture métallisée argent sous vernis : les reflets du studio dessinent les volumes.
  const paint = new THREE.MeshPhysicalMaterial({
    color: "#9c9c9c",
    metalness: 0.6,
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.15,
    transparent: true,
  });
  // Plastique brut grainé (bas de caisse, élargisseurs, bas de boucliers).
  const cladding = new THREE.MeshStandardMaterial({
    color: "#181818",
    metalness: 0,
    roughness: 0.78,
    transparent: true,
  });
  // Noir laqué (montants, encadrements, calandre fermée).
  const gloss = new THREE.MeshPhysicalMaterial({
    color: "#0c0c0c",
    metalness: 0.1,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
  });
  // Vitrage teinté : quasi noir, très réfléchissant.
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#060606",
    metalness: 0.15,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    // Reflets francs mais sous le seuil du bloom : le vitrage ne doit pas « briller ».
    envMapIntensity: 1.2,
    transparent: true,
  });
  // Chrome satiné (jonc de vitrage, inserts).
  const chrome = new THREE.MeshStandardMaterial({
    color: "#d8d8d8",
    metalness: 1,
    roughness: 0.16,
    transparent: true,
  });
  // Optiques allumées : le bloom les fait rayonner (non soumises au tone mapping).
  const lamp = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff").multiplyScalar(2.2),
    toneMapped: false,
    transparent: true,
  });
  // Feux arrière : blanc atténué (rendu monochrome, pas de rouge).
  const tailLamp = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#d9d9d9").multiplyScalar(1.15),
    toneMapped: false,
    transparent: true,
  });
  // Puits de roue et dessous : noir mat absorbant.
  const liner = new THREE.MeshStandardMaterial({
    color: "#050505",
    metalness: 0,
    roughness: 1,
    transparent: true,
  });
  const seams = new THREE.LineBasicMaterial({ color: "#151515", transparent: true });
  return {
    paint,
    cladding,
    gloss,
    glass,
    chrome,
    lamp,
    tailLamp,
    liner,
    seams,
    all: [paint, cladding, gloss, glass, chrome, lamp, tailLamp, liner, seams] as FadeMat[],
  };
}

export type BodyMaterials = ReturnType<typeof bodyMaterials>;

/** Matériaux des roues (partagés par les quatre roues). */
export function wheelMaterials() {
  const tire = new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.9, metalness: 0, transparent: true });
  // Jante bi-ton : face usinée claire, flancs et creux gris anthracite.
  const machined = new THREE.MeshStandardMaterial({ color: "#d2d2d2", metalness: 1, roughness: 0.26, transparent: true });
  const darkMetal = new THREE.MeshStandardMaterial({ color: "#2c2c2c", metalness: 0.8, roughness: 0.42, transparent: true });
  const disc = new THREE.MeshStandardMaterial({ color: "#737373", metalness: 1, roughness: 0.45, transparent: true });
  const caliper = new THREE.MeshPhysicalMaterial({
    color: "#e6e6e6",
    metalness: 0.1,
    roughness: 0.35,
    clearcoat: 0.6,
    transparent: true,
  });
  return {
    tire,
    machined,
    darkMetal,
    disc,
    caliper,
    all: [tire, machined, darkMetal, disc, caliper] as FadeMat[],
  };
}

/**
 * Ombre de contact précalculée : empreinte douce de la caisse et appuis plus sombres
 * sous les pneus. Le plan fait `size` (x, z) mètres, centré sous la voiture.
 */
export function contactShadowTexture(opts: {
  size: [number, number];
  /** Empreinte de la caisse (longueur, largeur). */
  body: [number, number];
  /** Centres des appuis des pneus (x, z) et dimensions de l'appui (longueur, largeur). */
  patches: [number, number][];
  patch: [number, number];
}) {
  const W = 1024;
  const H = Math.round((W * opts.size[1]) / opts.size[0]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const sx = W / opts.size[0];
  const sz = H / opts.size[1];
  const px = (x: number) => W / 2 + x * sx;
  const pz = (z: number) => H / 2 + z * sz;

  // Rectangle arrondi tracé avec arcTo (roundRect n'existe pas dans tous les navigateurs).
  const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  // Forme dessinée hors du canevas : seule son ombre floutée y arrive (flou compatible partout).
  const softRect = (cx: number, cz: number, l: number, w: number, r: number, blur: number, alpha: number) => {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = W * 2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    roundedRect(px(cx - l / 2) - W * 2, pz(cz - w / 2), l * sx, w * sz, r * sx);
    ctx.fill();
    ctx.restore();
  };

  const [bl, bw] = opts.body;
  softRect(0, 0, bl * 1.02, bw * 1.04, 0.45, 90, 0.55); // pénombre large
  softRect(0, 0, bl * 0.9, bw * 0.86, 0.35, 34, 0.6); // ombre sous le plancher
  for (const [x, z] of opts.patches) {
    softRect(x, z, opts.patch[0] * 2.2, opts.patch[1] * 1.35, 0.08, 22, 0.7);
    softRect(x, z, opts.patch[0], opts.patch[1], 0.03, 6, 0.95); // appui du pneu
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}
