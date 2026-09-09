"use client";

import { useState } from "react";
import { projectConfig } from "@/config/project";
import { parseAmountInput } from "@/lib/amount-input";
import {
  estimateCreepsFromRubles,
  estimateRublesFromCreeps,
} from "@/lib/currency";

type CurrencyField = "creeps" | "rubles";

const formatConvertedAmount = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function CurrencyConverter() {
  const [creeps, setCreeps] = useState("10");
  const [rubles, setRubles] = useState("17");
  const [invalidField, setInvalidField] = useState<CurrencyField | null>(null);

  function updateAmount(field: CurrencyField, value: string) {
    const setSource = field === "creeps" ? setCreeps : setRubles;
    const setTarget = field === "creeps" ? setRubles : setCreeps;
    setSource(value);

    if (value.trim() === "") {
      setTarget("");
      setInvalidField(null);
      return;
    }

    const amount = parseAmountInput(value);
    if (amount === null) {
      setTarget("");
      setInvalidField(field);
      return;
    }

    try {
      const converted =
        field === "creeps"
          ? estimateRublesFromCreeps(amount)
          : estimateCreepsFromRubles(amount);
      setTarget(formatConvertedAmount.format(converted));
      setInvalidField(null);
    } catch {
      setTarget("");
      setInvalidField(field);
    }
  }

  const errorMessage = invalidField
    ? "Введите неотрицательное число без знаков и лишних символов."
    : null;

  return (
    <section className="panel converter" aria-labelledby="converter-heading">
      <p className="eyebrow">Справочный расчёт</p>
      <h2 className="panel-heading" id="converter-heading">
        Калькулятор Creeps
      </h2>

      <div className="converter-fields">
        <label className="field" htmlFor="converter-creeps">
          <span>Creeps</span>
          <span className="input-wrap">
            <input
              id="converter-creeps"
              inputMode="decimal"
              value={creeps}
              onChange={(event) => updateAmount("creeps", event.target.value)}
              aria-invalid={invalidField === "creeps"}
              aria-describedby={
                invalidField === "creeps"
                  ? "converter-creeps-error converter-hint"
                  : "converter-hint"
              }
            />
            <span className="input-unit" aria-hidden="true">
              Creeps
            </span>
          </span>
        </label>

        <span aria-hidden="true">↔</span>

        <label className="field" htmlFor="converter-rubles">
          <span>Рубли</span>
          <span className="input-wrap">
            <input
              id="converter-rubles"
              inputMode="decimal"
              value={rubles}
              onChange={(event) => updateAmount("rubles", event.target.value)}
              aria-invalid={invalidField === "rubles"}
              aria-describedby={
                invalidField === "rubles"
                  ? "converter-rubles-error converter-hint"
                  : "converter-hint"
              }
            />
            <span className="input-unit" aria-hidden="true">
              ₽
            </span>
          </span>
        </label>
      </div>

      <p className="field-hint" id="converter-hint">
        Можно вводить целые и дробные значения через точку или запятую. Результат
        отображается справочно, до 2 знаков после запятой.
      </p>
      {errorMessage ? (
        <p
          className="field-error"
          id={`converter-${invalidField}-error`}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <p className="converter-rate">
        1 Creeps = {projectConfig.rublesPerCreep.toLocaleString("ru-RU")} ₽.{" "}
        Расчёт по курсу, не пополнение баланса
      </p>
    </section>
  );
}
