"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { projectConfig } from "@/config/project";
import { publicAsset } from "@/lib/public-asset";
import styles from "./skin-hero.module.css";

// Real names and images observed on SkinSwap. Illustrations, never inventory.
const examples = [
  { weapon: "AK-47", finish: "X-Ray", image: "/hero-skins/ak47-xray.webp" },
  { weapon: "Butterfly Knife", finish: "Lore", image: "/hero-skins/butterfly-lore.webp" },
  { weapon: "Glock-18", finish: "Gamma Doppler Phase 3", image: "/hero-skins/glock-gamma.webp" },
  { weapon: "Karambit", finish: "Fade", image: "/hero-skins/karambit-fade.webp" },
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
        <div className={styles.cardMeta}><span>CS2</span><span aria-hidden="true">↗</span></div>
        <Image src={publicAsset(item.image)} alt="" width={260} height={190} sizes="(max-width: 600px) 170px, 260px" priority unoptimized />
        <figcaption><strong>{item.weapon}</strong><span>{item.finish}</span></figcaption>
      </figure>)}
    </div>)}
  </div>;
}

export function SkinHero() {
  const [paused, setPaused] = useState(false);
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
      <h1 id="page-title">{projectConfig.siteName}<span className={styles.accent}>.</span></h1>
      <p className={styles.description}>Выбирайте в витрине.<br />Получайте на свой trade-URL.</p>
      <Link className={`button-primary ${styles.cta}`} href="/catalog">Перейти в каталог <span aria-hidden="true">↗</span></Link>
      <div className={styles.heroNote}><span className={styles.noteRule} aria-hidden="true" /><p>Вход через Steam.<br />Цены в Creeps — с эквивалентом в рублях.</p></div>
    </div>
    <div className={styles.showcase}>
      <div className={styles.stage} ref={sceneRef} data-paused={paused || !visible || !tabVisible} aria-label="Примеры скинов CS2">
        <div className={styles.perspective}>
          <SkinLane items={[examples[1], examples[0]]} />
          <SkinLane items={[examples[3], examples[2]]} reverse />
        </div>
      </div>
      <div className={styles.caption}>
        <p>Примеры скинов · <a href="https://skinswap.com/ru" target="_blank" rel="noreferrer">SkinSwap ↗</a><span>Наличие в магазине не подтверждено</span></p>
        <button className={`button-secondary ${styles.pause}`} type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Продолжить движение карточек" : "Приостановить движение карточек"}><span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>{paused ? "Продолжить" : "Пауза"}</button>
      </div>
    </div>
  </section>;
}
