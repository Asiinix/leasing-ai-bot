import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { appPath } from "@/lib/app-path";
import { dateLabel, money, moneyPrecise, percent } from "@/lib/format";
import { parseProposal, proposalCalculation } from "@/features/proposal/snapshot";
import { ProposalActions } from "@/features/proposal/proposal-actions";
import { proposalQr } from "@/features/proposal/qr";
import { calculatorResumePath } from "@/features/proposal/resume-link";
import { VEHICLE_CATEGORIES } from "@/features/insurance/categories";
import { vehiclePhoto } from "@/features/fixed-price-catalog/photos";
import "./proposal.css";

export const metadata: Metadata = {
  title: "Коммерческое предложение · BCC Leasing",
  description: "Индивидуальный расчёт лизинга, график платежей и страхование КАСКО.",
};

export default async function ProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>;
}) {
  const data = parseProposal((await searchParams).data);
  if (!data)
    return (
      <main className="proposal-empty">
        <Image
          src={appPath("/brand/bcc-leasing-logo.png")}
          width={224}
          height={37}
          alt="BCC Leasing"
        />
        <h1>Сформируйте предложение в калькуляторе</h1>
        <p>Выберите автомобиль и условия, затем нажмите «Показать КП» под кнопкой оформления.</p>
        <Link href="/" className="proposal-home">
          Открыть калькулятор <ArrowUpRight size={18} />
        </Link>
      </main>
    );
  const { quote, schedule, insurance, osrns } = proposalCalculation(data);
  const qr = await proposalQr(data);
  const category = VEHICLE_CATEGORIES[data.insurance.category];
  const modelName = data.model.name
    .toLocaleLowerCase()
    .startsWith(data.model.brand.toLocaleLowerCase())
    ? data.model.name
    : `${data.model.brand} ${data.model.name}`;
  const photo = vehiclePhoto({ brand: data.model.brand, model: data.model.name });
  const priceLabel = {
    manual: "Стоимость указана в калькуляторе",
    estimate: "Ориентировочная демо-цена",
    reference: "Стоимость из сохранённого прайса",
    example: "Пример стоимости для расчёта",
  }[data.priceSource];
  return (
    <main className="proposal-page">
      <ProposalActions calculatorHref={appPath(calculatorResumePath(data) as `/${string}`)} />
      <article className="proposal-document">
        <header className="proposal-header">
          <Image
            src={appPath("/brand/bcc-leasing-logo.png")}
            width={966}
            height={160}
            alt="BCC Leasing"
            priority
          />
          <div>
            <span>Предварительный расчёт</span>
            <time dateTime={data.createdAt}>{dateLabel(data.createdAt)}</time>
          </div>
        </header>
        <div className="proposal-intro">
          <p className="proposal-eyebrow">
            Финансовый лизинг · {data.clientType === "IP" ? "для ИП" : "для ТОО"}
          </p>
          <h1>
            Коммерческое
            <br />
            предложение
          </h1>
          <p>Техника для ваших задач. Условия, которые можно спланировать.</p>
        </div>
        <section className="proposal-hero" aria-label="Автомобиль и платёж">
          <div className="proposal-asset">
            <span className="proposal-overline">Предмет лизинга · 1 единица</span>
            <h2>{modelName}</h2>
            <p>{[data.trim, data.modelYear].filter(Boolean).join(" · ") || category.label}</p>
            {photo?.kind === "model" && (
              <Image
                src={appPath(photo.src as `/${string}`)}
                alt={modelName}
                width={640}
                height={400}
                unoptimized
                className="proposal-vehicle"
              />
            )}
          </div>
          <div className="proposal-payment">
            <span>Ежемесячный платёж</span>
            <strong>{moneyPrecise(quote.monthlyPayment)}</strong>
            <p>на {quote.rate.months} месяцев</p>
            <div className="proposal-payment-rule" />
            <span>Аванс {percent(quote.rate.advancePercent)}%</span>
            <b>{money(quote.advanceAmount)}</b>
            <small>По аннуитетному графику</small>
          </div>
        </section>
        <div className="proposal-totals" aria-label="Основные суммы">
          <div>
            <span>Стоимость техники</span>
            <strong>{money(quote.price)}</strong>
          </div>
          <div>
            <span>Первоначальный взнос</span>
            <strong>{money(quote.advanceAmount)}</strong>
          </div>
          <div>
            <span>Сумма финансирования</span>
            <strong>{money(quote.principal)}</strong>
          </div>
        </div>
        <p className="proposal-caption">
          {priceLabel}.{" "}
          {data.model.partnerName &&
            `${data.model.partnerName === "Общий каталог авто" ? "Источник модели" : "Поставщик"}: ${data.model.partnerName}.`}
        </p>
        <section className="proposal-section" aria-labelledby="proposal-terms">
          <div className="proposal-section-heading">
            <span>01</span>
            <h2 id="proposal-terms">Условия вашего лизинга</h2>
          </div>
          <dl className="proposal-terms">
            <div>
              <dt>Продукт</dt>
              <dd>Финансовый лизинг</dd>
            </div>
            <div>
              <dt>Срок</dt>
              <dd>{quote.rate.months} месяцев</dd>
            </div>
            <div>
              <dt>Годовая ставка</dt>
              <dd>{percent(quote.rate.annualRate)}%</dd>
            </div>
            <div>
              <dt>Тип клиента</dt>
              <dd>
                {data.clientType === "IP"
                  ? "Индивидуальный предприниматель"
                  : "Товарищество с ограниченной ответственностью"}
              </dd>
            </div>
            <div>
              <dt>График</dt>
              <dd>Аннуитетный, ежемесячно</dd>
            </div>
            <div>
              <dt>Вознаграждение за срок</dt>
              <dd>{moneyPrecise(quote.totalInterest)}</dd>
            </div>
          </dl>
          <div className="proposal-total-line">
            <span>Всего по лизингу с учётом аванса</span>
            <strong>{moneyPrecise(quote.totalWithAdvance)}</strong>
          </div>
          <p className="proposal-caption">
            Без страхования, комиссий и дополнительных расходов. Условия расчёта от{" "}
            {dateLabel(data.termsCheckedAt)}
            {data.termsSource === "snapshot" ? " — сохранённые тарифы" : ""}.
          </p>
        </section>
        <section className="proposal-section" aria-labelledby="proposal-insurance">
          <div className="proposal-section-heading">
            <span>02</span>
            <h2 id="proposal-insurance">Страхование КАСКО</h2>
          </div>
          <div className="proposal-insurance-card">
            <div className="proposal-insurance-description">
              <span className="proposal-insurance-status">
                <ShieldCheck size={17} />
                {data.insurance.enabled ? "Выбрано в расчёте" : "Можно добавить к лизингу"}
              </span>
              <h3>Защита вашей техники</h3>
              <p>
                КАСКО — страхование автомобиля от повреждений и угона, в том числе при ДТП, пожаре
                или стихийных бедствиях. Покрытие определяется условиями полиса.
              </p>
              <p className="proposal-insurance-category">
                {category.label} · {percent(insurance.ratePercent)}% от стоимости в год
              </p>
            </div>
            <div className="proposal-insurance-price">
              <span>{data.insurance.enabled ? "КАСКО за год" : "При подключении · за год"}</span>
              <strong>{money(insurance.annual)}</strong>
              <small>Оплачивается отдельно</small>
            </div>
          </div>
          <p className="proposal-caption">
            {money(quote.price)} × {percent(insurance.ratePercent)}% = {money(insurance.annual)} в
            год. КАСКО не включено в ежемесячный платёж и итоговую сумму лизинга.
          </p>
        </section>
        {osrns && (
          <section className="proposal-section" aria-labelledby="proposal-osrns">
            <div className="proposal-section-heading">
              <span>03</span>
              <h2 id="proposal-osrns">Страхование ОСРНС</h2>
            </div>
            <div className="proposal-insurance-card">
              <div className="proposal-insurance-description">
                <span className="proposal-insurance-status">
                  <ShieldCheck size={17} /> Защита работников
                </span>
                <h3>Обязательное страхование работника от несчастных случаев</h3>
                <p>
                  Страхование при исполнении трудовых обязанностей. Стоимость рассчитана по годовому
                  фонду оплаты труда и тарифу для выбранного ОКЭД.
                </p>
                <dl className="proposal-osrns-details">
                  <div>
                    <dt>ОКЭД</dt>
                    <dd>
                      {osrns.tariff.code} · {osrns.tariff.name}
                    </dd>
                  </div>
                  <div>
                    <dt>ГФОТ</dt>
                    <dd>{money(osrns.annualPayroll)}</dd>
                  </div>
                  <div>
                    <dt>Тариф</dt>
                    <dd>
                      {percent(osrns.ratePercent)}% · класс риска {osrns.tariff.riskClass}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="proposal-insurance-price">
                <span>ОСРНС за год</span>
                <strong>{money(osrns.annualPremium)}</strong>
                <small>Оплачивается отдельно</small>
              </div>
            </div>
            <p className="proposal-caption">
              {money(osrns.annualPayroll)} × {percent(osrns.ratePercent)}% ={" "}
              {moneyPrecise(osrns.calculatedPremium)}.
              {osrns.minimumApplied && " Применена минимальная стоимость — 85 000 ₸."} ОСРНС не
              включено в платежи по лизингу и стоимость КАСКО.
            </p>
          </section>
        )}
        <section className="proposal-section proposal-schedule" aria-labelledby="proposal-schedule">
          <div className="proposal-section-heading">
            <span>{osrns ? "04" : "03"}</span>
            <h2 id="proposal-schedule">График платежей</h2>
          </div>
          <p className="proposal-section-intro">
            {quote.rate.months} ежемесячных платежей. Все суммы в тенге.
          </p>
          <div
            className="proposal-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Полный график платежей"
          >
            <table>
              <caption className="visually-hidden">
                График лизинга {modelName}, {quote.rate.months} месяцев
              </caption>
              <thead>
                <tr>
                  <th scope="col">Месяц</th>
                  <th scope="col">Платёж, ₸</th>
                  <th scope="col">Основной долг, ₸</th>
                  <th scope="col">Вознаграждение, ₸</th>
                  <th scope="col">Остаток долга, ₸</th>
                </tr>
              </thead>
              <tbody>
                <tr className="proposal-advance">
                  <th scope="row">Аванс</th>
                  <td>{moneyPrecise(quote.advanceAmount).replace(" ₸", "")}</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{moneyPrecise(quote.principal).replace(" ₸", "")}</td>
                </tr>
                {schedule.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">{row.month}</th>
                    {[row.payment, row.principal, row.interest, row.balance].map((value, i) => (
                      <td key={i}>{moneyPrecise(value).replace(" ₸", "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Итого с авансом</th>
                  <td>{moneyPrecise(quote.totalWithAdvance).replace(" ₸", "")}</td>
                  <td>{moneyPrecise(quote.principal).replace(" ₸", "")}</td>
                  <td>{moneyPrecise(quote.totalInterest).replace(" ₸", "")}</td>
                  <td>0,00</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="proposal-caption">
            Аванс оплачивается до начала финансирования. Месяцы указаны относительно начала
            договора; календарные даты определяются при оформлении. Последний платёж скорректирован
            для полного погашения остатка.
          </p>
        </section>
        <section className="proposal-section proposal-next" aria-labelledby="proposal-next">
          <div className="proposal-section-heading">
            <span>{osrns ? "05" : "04"}</span>
            <h2 id="proposal-next">Следующий шаг — оформление</h2>
          </div>
          <ol className="proposal-steps">
            {[
              "Заявка и документы",
              "Согласование условий",
              "Договор и аванс",
              "Получение техники",
            ].map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="proposal-note">
            <Check size={18} /> Выбранные параметры собраны в одном предложении. Сохраните его для
            обсуждения условий с менеджером.
          </p>
          <div className="proposal-qr" aria-labelledby="proposal-qr-heading">
            <a
              href={qr.href}
              target="_blank"
              rel="noreferrer"
              aria-label="Открыть этот расчёт на сайте BCC Leasing"
              className="proposal-qr-image"
            >
              <Image
                src={qr.image}
                width={288}
                height={288}
                unoptimized
                alt="QR-код для открытия калькулятора с параметрами этого КП"
              />
            </a>
            <div>
              <h3 id="proposal-qr-heading">Продолжите расчёт на телефоне</h3>
              <p>
                Наведите камеру на QR-код. Автомобиль, стоимость, аванс, срок и выбранное
                страхование уже будут заполнены.
              </p>
              <a href={qr.href} target="_blank" rel="noreferrer" className="proposal-qr-link">
                Открыть этот расчёт <ArrowUpRight size={16} />
              </a>
              <span className="proposal-qr-domain">leasing-ai-bot-production.up.railway.app</span>
            </div>
          </div>
        </section>
        <footer className="proposal-footer">
          <div>
            <strong>АО «BCC Leasing»</strong>
            <a href="https://bccleasing.kz/" target="_blank" rel="noreferrer">
              bccleasing.kz <ArrowUpRight size={14} />
            </a>
          </div>
          <p>
            Предварительное предложение для демонстрации. Не является публичной офертой.
            Окончательные условия, расходы и график фиксируются в договоре лизинга.
          </p>
          {photo?.kind === "model" && (
            <Link href="/photo-credits" className="proposal-credits">
              Источники фотографий
            </Link>
          )}
        </footer>
      </article>
    </main>
  );
}
