"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { projectConfig } from "@/config/project";
import { publicAsset } from "@/lib/public-asset";
import styles from "./skin-hero.module.css";

// Real names and images observed on SkinSwap. Illustrations, never inventory.
const examples = [
  { weapon: "AK-47", finish: "X-Ray", image: "/catalog/dd5df14fb4b74f094b4c.avif" },
  { weapon: "Butterfly Knife", finish: "Lore", image: "/catalog/40b9881f2583342d3477.avif" },
  { weapon: "Glock-18", finish: "Gamma Doppler Phase 3", image: "/catalog/f4d807133d5bcf19ba5d.avif" },
  { weapon: "Karambit", finish: "Fade", image: "/catalog/7ac891d4055dca1a68de.avif" },
] as const;

// Motion adapted from Magic UI's Marquee / Marquee 3D, obtained via its MCP registry.
// Repeated tracks + reverse direction + perspective, translated from Tailwind to CSS.
// Source: https://magicui.design/docs/components/marquee
function SkinLane({ items, reverse = false }: {
  items: readonly (typeof examples)[number][];
  reverse?: boolean;
}) {
  return <div className={`${styles.lane} ${reverse ? styles.reverse : ""}`}>
    {[0, 1].map((copy) => <div className={styles.track} key={copy} aria-hidden={copy === 1 ? true : undefined}>
      {items.map((item) => <figure className={styles.card} key={item.weapon}>
        <div className={styles.cardMeta}><span>CS2</span></div>
        <Image src={publicAsset(item.image)} alt="" width={260} height={190} sizes="(max-width: 600px) 170px, 260px" priority unoptimized />
        <figcaption><strong>{item.weapon}</strong><span>{item.finish}</span></figcaption>
      </figure>)}
    </div>)}
  </div>;
}

export function SkinHero() {
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    if (sceneRef.current) observer.observe(sceneRef.current);
    const updateVisibility = () => setTabVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", updateVisibility); };
  }, []);

  return <section className={`${styles.hero} panel`} aria-labelledby="page-title">
    <div className={styles.copy}>
      <p className="eyebrow"><span className={styles.statusDot} aria-hidden="true" />Скины и цифровые товары</p>
      <h1 id="page-title">{projectConfig.siteName}</h1>
      <p className={styles.description}>Выбирайте в витрине.<br />Получайте на свой trade-URL.</p>
      <Link className={`button-primary ${styles.cta}`} href="/catalog">Перейти в каталог <span aria-hidden="true">↗</span></Link>
      <div className={styles.heroNote}><span className={styles.noteRule} aria-hidden="true" /><p>Вход через Steam.<br />Цены в Creeps — с эквивалентом в рублях.</p></div>
    </div>
    <div className={styles.showcase}>
      <div className={styles.stage} ref={sceneRef} data-paused={!visible || !tabVisible} aria-label="Примеры скинов CS2">
        <div className={styles.perspective}>
          <SkinLane items={[examples[1], examples[0]]} />
          <SkinLane items={[examples[3], examples[2]]} reverse />
        </div>
      </div>
    </div>
  </section>;
}
