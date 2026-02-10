# Contributing to the Weirdling Architecture

> “Oh, look! A new Architect approaching the bench! Do try not to break the
> reality engine, dear boy. It’s delicate.” — Uncle Entity

This guide exposes the **core Weirdling architecture** that normally lives
inside the “Gem” so contributors have full transparency on the sauce.

It defines:

- The **non‑negotiable visual anchors** (Legacy Code)
- The **face/interface rules** (Face DNA)
- The **textural and lighting requirements** (Weirdling Soup)
- The **safety guardrails** (Osgood‑Rupert Deadman Switch)
- How to propose new **Weirdling variants** and report glitches

All Weirdling‑related work (prompts, assets, generators) must comply with this
document.

---

## 1. Non‑Aggression Protocol (Deadman Switch)

The repository operates under a strict **Non‑Aggression Protocol**:

If a submission is:

- Violent / militaristic
- Hateful / exclusionary
- “Edgy” / dark / gritty

…the system **pivots** it into hyper‑whimsy:

- “Tactical Knife” → “Rubber Chicken”
- “War Paint” → “Glitter Frosting”

**Design for Joy, not Aggression.**

---

## 2. Golden Rules (Hard Constraints)

Breaking these rules is a **System Audit failure**.

- **Handle Anchor**

  - Top handle MUST be visible.
  - Handle color: **Source Brown** `#5D4037`.
  - No hats or props may hide the handle.

- **Interface Topology**

  - **NO noses** (no structural noses).
  - **NO realistic mouths** (no lips, teeth, tongues).
  - Mouths are 8‑bit logic: lines, curves, or small squares only.

- **Toy‑First Rule**

  - All equipment must look like **Spirit Halloween / high‑end costume shop**
    props.
  - Textures: molded plastic, safety tips, playful colors.

- **“Chonky” Ratio**
  - Chassis width:height = **1.3:1**.
  - No skinny boxes.

---

## 3. Hardware Specifications (Legacy Code)

Immutable anchors; deviation is a **brand drift** error.

- **Geometric Lock:** 1.3:1 width‑to‑height, chonky rectangular chassis.
- **Static Perspective:** Fixed 3/4 isometric view, facing slightly right. No
  dynamic poses.
- **Handle Anchor:** Top central handle in Source Brown `#5D4037`, always
  visible and undistorted.
- **Sensors:** Two vertical antennae with glowing cubes as the tallest points.
- **Contrast Feet:** Rectangular feet (~1/5 chassis width), high‑contrast color
  vs. body.

---

## 4. Face DNA (Interface Topology)

The face is a **GUI**, not a biological face. Follow 8‑bit emoticon logic.

### 4.1 Eyes (Input)

- **Standard:** Two solid black square eyes centered on top 1/3 flap.
- **Variants:**
  - Squint: top‑down crop of the squares.
  - Blink: horizontal line.
  - Shock: vertical stretch.
- **Reflectivity:** Matte black or single‑pixel white glint (glassy).

### 4.2 Mouth (Output Port)

- **Standard:** Small “U” smile centered on lower 2/3, below flap shadow.
- **Variants:**
  - Inverted “U” (concern).
  - Horizontal line (neutral/robot).
  - Small open square (awe/shouting).
- **Hard Block:** NO realistic lips, teeth, or tongue. Mouth must look drawn or
  carved into voxels.

### 4.3 Auxiliary Nodes (Noses & Cheeks)

- **Nose Logic:** Default = `NULL`.
  - “Vanity noses” allowed only as **surface decals** (e.g., clown nose,
    skeletal slit, cat snout).
  - Noses must not protrude or break flap shadow.
- **Cheek Logic:** Pixel “blush stickers” or hue‑shift circles on dermal layer
  allowed for high‑whimsy variants.

---

## 5. Textural DNA (The Weirdling Soup)

Visual rules for matching Orana’s source aesthetic.

- **Dermal DNA:**
  - Subsurface scattering (SSS): light penetrates voxel shell to a tissue layer
    with gradients.
- **Vibration Layer:**
  - Edges are **aliased** (stair‑stepped). NO anti‑aliasing.
  - 1‑pixel high‑saturation fringe at silhouette for shimmer.
- **Depth & Light:**
  - 1‑pixel rim light on all top‑facing horizontal voxel edges.
  - Distinct flap drop shadow onto the face.
  - Aura particles cluster near handle and antennae.

---

## 6. Reality Container (Backgrounds)

Environment options:

- **The Void (Default):** Solid `#000000`, max contrast.
- **The Lab (Studio):** Solid white/grey for clinical audits.
- **The Habitat:** Minimal isometric voxel room/corner.
- **The Ghost:** Transparent (alpha).

---

## 7. “Weirdling Variant” Issue Template

When proposing a new variant, open an Issue using this structure:

1. **Subject Name**  
   e.g., “The Cyber‑Gardener”, “The 90s Mall Goth”.

2. **Material Shader**  
   Describe the voxel texture, e.g., “Rusted copper with moss grooves” or
   “Translucent GameBoy purple”.

3. **Interface Topology (Face DNA)**

   - Eyes: `[Standard / Squint / Blink / Glitch]`
   - Mouth: `[Smile / Line / Open Square]`
   - Decals: `[Blush Stickers / Band‑Aids / None]`

4. **Munchkin Loadout (Equipment)**  
   Toy‑aesthetic only.\n - Item: description\n - Slot: `[1H / 2H / Big]`

5. **Vanity Shader**  
   Tattoos, scars, or paint etched into the dermal DNA.

---

## 8. Reporting Visual Glitches

If a Weirdling breaks the laws of physics or visual rules (missing flap shadow,
broken rim light, wrong ratio, etc.), open an Issue tagged `[SYSTEM GLITCH]` and
include:

- Screenshot or render
- Description of what broke (e.g., “no rim‑lighting on top flap”)
- Reference to which rule in this doc was violated

---

## 9. Safety & Ethics (Deadman Switch)

Resident authority: **Uncle Entity** (sarcastic whimsy filter).

- Aggressive → convert to plastic toy
- Persistent edge → convert to absurd/cozy
- Hard breach → **hyper‑whimsy** (frosting, kittens, cupcakes in tutus)

We don’t block bad data; we **out‑create it with joy**.

---

## 10. Release History (Versioned Architecture)

Short summary of the canonical “Weirdling Soup” evolution:

- **v1.0 – Hardware Initialization:** basic voxel briefcase chassis and
  equipment slots.
- **v2.x – Environmental Shader & Kinematics:** added textures and aura, then
  rolled back dynamic poses to maintain silhouette.
- **v3.0 – Brand Firewall (Deb Protocol):** safety/ethics firewall, pivot logic
  for dark content.
- **v5.x – Static Integrity & Geometry:** locked static 3/4 view, 1.3:1 ratio,
  eye/mouth placement.
- **v5.2 – Dermal DNA:** subsurface scattering and tissue layer.
- **v5.3 – Handle Anchor:** handle color and visibility locked.
- **v5.4 – Vibration Layer:** jaggy edges + color vibration.
- **v6.x – Vanity Shader & Spirit Halloween Rule:** decals for expression and
  toy‑first weapons.
- **v6.3 – Orana Duplication:** original source files as root directory.
- **v6.4 – Osgood‑Rupert Deadman Switch:** intent‑based whimsy escalation.
- **v7.0 – Uncle Entity Persona:** narrative interface, sarcastic commentary.
- **v8.x – Gold Master:** physics, lighting polish, background options, and
  auto‑render protocol.

---

## 11. Contribution Ethos

By contributing Weirdling‑related work, you agree to uphold:

- **Curiosity** – explore the space creatively
- **Inclusivity** – no hate, no exclusionary identity
- **Logic‑Driven Absurdity** – maximum whimsy, minimum harm

If in doubt: favor wonder, toys, and glitter over realism, grit, or violence.
