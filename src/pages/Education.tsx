/**
 * Environmental Education page.
 *
 * Content policy: everything here is widely published, non-controversial
 * background on pollutants, indices and conservation. Health statements are
 * kept at the level the EPA's own AQI category descriptions use, and nothing
 * is presented as medical advice or attributed to a specific study.
 */

import { useState } from 'react'
import {
  BookOpen,
  Droplets,
  Leaf,
  ShieldCheck,
  Wind,
} from 'lucide-react'
import { PageHeader } from '@/components/StatCard'
import { Badge, Card, CardBody, CardHeader, DisclaimerNote } from '@/components/ui'
import { AQI_CATEGORIES, POLLUTANT_KEYS, POLLUTANT_META } from '@/lib/aqi'
import { WATER_PARAMETERS, WATER_PARAMETER_KEYS, WATER_SAFETY_DISCLAIMER } from '@/lib/wqi'

type TabId = 'aqi' | 'pollutants' | 'water' | 'conservation'

const TABS: { id: TabId; label: string; icon: typeof Wind }[] = [
  { id: 'aqi', label: 'AQI categories', icon: BookOpen },
  { id: 'pollutants', label: 'Air pollutants', icon: Wind },
  { id: 'water', label: 'Water indicators', icon: Droplets },
  { id: 'conservation', label: 'What you can do', icon: Leaf },
]

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('aqi')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Environmental Education"
        description="Background on how air and water quality are measured, what the numbers mean, and what reduces pollution in practice."
      />

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Education topics"
        className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'aqi' ? <AqiPanel /> : null}
      {activeTab === 'pollutants' ? <PollutantsPanel /> : null}
      {activeTab === 'water' ? <WaterPanel /> : null}
      {activeTab === 'conservation' ? <ConservationPanel /> : null}
    </div>
  )
}

function Panel({ id, children }: { id: TabId; children: React.ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className="space-y-5"
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function AqiPanel() {
  return (
    <Panel id="aqi">
      <Card>
        <CardHeader
          title="What the Air Quality Index actually is"
          icon={<BookOpen className="h-4 w-4" aria-hidden />}
        />
        <CardBody className="prose-section">
          <p>
            An Air Quality Index converts the measured concentration of several
            pollutants into a single number on a fixed scale, so that a reading in
            micrograms per cubic metre — which means little to most people — becomes
            something comparable and actionable.
          </p>
          <p>
            The method is the same everywhere. For each pollutant, the measured
            concentration is looked up in a table of breakpoints, and a straight-line
            formula converts it into a sub-index. The overall AQI is then the{' '}
            <strong>highest</strong> of those sub-indices, not an average. That matters:
            the index deliberately reports the worst pollutant, because being exposed to
            one dangerous pollutant is not made safer by the others being low. The
            pollutant producing the maximum is called the dominant pollutant.
          </p>
          <h3>Why this application uses one standard only</h3>
          <p>
            Countries define different breakpoints. The same air at 60 µg/m³ of PM2.5
            lands in different categories under the US EPA AQI, India's CPCB National
            AQI and the European EAQI. Mixing scales — taking a number from one and a
            category label from another — produces a figure that means nothing. This
            application therefore uses the <strong>US EPA AQI</strong> throughout, and
            states that on every page where an index value appears.
          </p>
          <h3>The six categories</h3>
        </CardBody>
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[44rem]">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="table-head">Range</th>
                <th scope="col" className="table-head">Category</th>
                <th scope="col" className="table-head">Who is affected</th>
                <th scope="col" className="table-head">Suggested action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {AQI_CATEGORIES.map((category) => (
                <tr key={category.key}>
                  <td className="table-cell font-mono text-xs">
                    {category.range[0]}–{category.range[1]}
                  </td>
                  <td className="table-cell">
                    <Badge className={category.colorClass}>{category.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {category.healthEffects}
                  </td>
                  <td className="px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {category.shortAdvice}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardBody className="border-t border-slate-200 dark:border-slate-800">
          <DisclaimerNote>
            These category descriptions follow the general wording the US EPA publishes
            with the AQI. They are general information, not medical advice. If you have
            a heart or lung condition, follow guidance from your own doctor.
          </DisclaimerNote>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reading an AQI number sensibly" />
        <CardBody className="prose-section">
          <h3>It is a modelled estimate at a point</h3>
          <p>
            The values in this application come from a global atmospheric composition
            model interpolated to your chosen coordinates. That is useful for a city
            but it is not the same as a reference-grade monitor standing on that street.
            Air quality can vary sharply over a few hundred metres — beside a busy road
            versus inside a park.
          </p>
          <h3>Averaging periods differ by pollutant</h3>
          <p>
            EPA breakpoints assume a 24-hour average for particulates, an 8-hour average
            for ozone and carbon monoxide, and a 1-hour average for nitrogen dioxide and
            sulphur dioxide. A single hourly snapshot compared against a 24-hour
            breakpoint is an approximation, which is why the hourly chart matters more
            than any one reading.
          </p>
          <h3>Trends tell you more than a single number</h3>
          <p>
            A reading of 150 that has been falling all afternoon means something
            different from a reading of 150 that has been climbing since dawn. That is
            why every page in this application pairs the current value with its history.
          </p>
        </CardBody>
      </Card>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */

function PollutantsPanel() {
  return (
    <Panel id="pollutants">
      <div className="grid gap-5 lg:grid-cols-2">
        {POLLUTANT_KEYS.map((key) => {
          const meta = POLLUTANT_META[key]
          return (
            <Card key={key}>
              <CardHeader
                title={`${meta.shortLabel} — ${meta.label}`}
                icon={<Wind className="h-4 w-4" aria-hidden />}
                subtitle={`Reported in ${meta.unit} · EPA ${meta.averagingPeriod}`}
              />
              <CardBody className="space-y-3">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {meta.description}
                </p>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Main sources
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {meta.sources}
                  </p>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader
          title="Effects of air pollution"
          icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
        />
        <CardBody className="prose-section">
          <h3>On people</h3>
          <ul>
            <li>
              Short-term exposure to elevated particulates and gases commonly causes
              eye, nose and throat irritation, coughing, and shortness of breath.
            </li>
            <li>
              People with asthma or other respiratory conditions are more likely to
              experience symptoms, and at lower concentrations than the general public.
            </li>
            <li>
              Long-term exposure to fine particulates is associated with increased risk
              of respiratory and cardiovascular disease. This is the reason PM2.5 is the
              pollutant that most air quality policy targets.
            </li>
            <li>
              Children, older adults and pregnant people are usually treated as
              sensitive groups in public health guidance.
            </li>
          </ul>
          <h3>On the environment</h3>
          <ul>
            <li>
              Ground-level ozone damages plant tissue and measurably reduces crop
              yields.
            </li>
            <li>
              Sulphur and nitrogen oxides form acid deposition, which acidifies soils
              and freshwater and damages stonework and buildings.
            </li>
            <li>
              Nitrogen deposition over-fertilises water bodies, feeding algal blooms
              that strip dissolved oxygen out of the water — which is precisely what
              the dissolved oxygen parameter on the water page detects.
            </li>
            <li>
              Particulates reduce visibility and alter how much sunlight reaches the
              ground.
            </li>
          </ul>
          <h3>How air and water quality connect</h3>
          <p>
            The two halves of this project are not separate topics. Airborne pollutants
            are deposited into rivers and lakes by rain and gravity, which raises
            turbidity and nutrient load; and warmer air raises water temperature, which
            lowers how much oxygen water can hold. Monitoring both together gives a
            fuller picture than either alone.
          </p>
        </CardBody>
      </Card>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */

function WaterPanel() {
  return (
    <Panel id="water">
      <Card>
        <CardHeader
          title="Water quality indicators"
          icon={<Droplets className="h-4 w-4" aria-hidden />}
          subtitle="The six parameters this application records, and what each one tells you."
        />
        <CardBody className="space-y-4">
          {WATER_PARAMETER_KEYS.map((key) => {
            const meta = WATER_PARAMETERS[key]
            return (
              <div
                key={key}
                className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {meta.label}
                    {meta.unit ? (
                      <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                        ({meta.unit})
                      </span>
                    ) : null}
                  </h3>
                  <Badge className="bg-slate-100 text-slate-700 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300">
                    Acceptable: {meta.acceptable}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {meta.description}
                </p>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What these six parameters cannot tell you" />
        <CardBody className="prose-section">
          <p>
            This is the most important limitation in the whole project, so it is stated
            plainly. The six parameters recorded here are{' '}
            <strong>physico-chemical</strong>. They describe the physical and chemical
            state of the water. They say nothing at all about whether it is safe to
            drink.
          </p>
          <p>Water can score well on all six and still be dangerous. Establishing potability additionally requires at minimum:</p>
          <ul>
            <li>
              <strong>Bacteriological testing</strong> — E. coli and total coliforms.
              Faecal contamination is invisible, odourless and does not change pH,
              turbidity or conductivity meaningfully.
            </li>
            <li>
              <strong>Heavy metals and chemical contaminants</strong> — arsenic, lead,
              fluoride, nitrate, pesticides. These are common in groundwater in many
              regions and are undetectable without laboratory analysis.
            </li>
            <li>
              <strong>Residual disinfectant</strong> — for treated supplies, confirming
              that chlorination is still effective at the point of use.
            </li>
            <li>
              <strong>Assessment against the applicable standard</strong> — the limits
              that legally apply depend on the country and the intended use.
            </li>
          </ul>
          <h3>What the six parameters are genuinely good for</h3>
          <ul>
            <li>
              <strong>Comparing water bodies</strong> — a river reach with 2.8 mg/L
              dissolved oxygen is clearly more stressed than one with 7.1 mg/L.
            </li>
            <li>
              <strong>Detecting change over time</strong> — rising turbidity or falling
              dissolved oxygen at the same site is a real signal worth investigating.
            </li>
            <li>
              <strong>Screening</strong> — results outside the acceptable ranges are a
              reason to order proper laboratory testing.
            </li>
            <li>
              <strong>Assessing aquatic habitat</strong> — dissolved oxygen and
              temperature directly determine whether fish can survive.
            </li>
          </ul>
          <DisclaimerNote>{WATER_SAFETY_DISCLAIMER}</DisclaimerNote>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How water samples should be collected" />
        <CardBody className="prose-section">
          <p>
            Measurement quality depends on collection as much as on the instrument.
            General good practice:
          </p>
          <ul>
            <li>
              Rinse the sample container with the water being sampled before filling it.
            </li>
            <li>
              For a tap, run the water for one to two minutes first unless you are
              specifically testing what has been standing in the pipes.
            </li>
            <li>
              Measure temperature, pH and dissolved oxygen as soon as possible — all
              three change once the sample leaves the source.
            </li>
            <li>
              Fill dissolved oxygen samples completely, with no trapped air bubble.
            </li>
            <li>
              Record the exact location, date and time. An unlabelled measurement cannot
              be compared with anything later, which is why those fields are required in
              this application.
            </li>
            <li>
              Calibrate meters before use, and note in the observations field if you
              could not.
            </li>
          </ul>
        </CardBody>
      </Card>
    </Panel>
  )
}

/* -------------------------------------------------------------------------- */

function ConservationPanel() {
  return (
    <Panel id="conservation">
      <Card>
        <CardHeader
          title="Practical pollution reduction"
          icon={<Leaf className="h-4 w-4" aria-hidden />}
          subtitle="Measures with a well-established effect, grouped by who can act."
        />
        <CardBody className="prose-section">
          <h3>Individual and household</h3>
          <ul>
            <li>
              Shift trips to walking, cycling or public transport where practical. Road
              transport is a dominant source of nitrogen dioxide and a large source of
              urban particulates.
            </li>
            <li>
              Maintain vehicles — correct tyre pressure and a serviced engine both
              reduce emissions per kilometre.
            </li>
            <li>
              Avoid burning waste, leaves or crop residue. Open burning is an
              exceptionally large particulate source for the amount of material burned.
            </li>
            <li>
              Replace solid-fuel cooking and heating with cleaner fuels or electricity
              where it is available, and ventilate when cooking.
            </li>
            <li>
              Reduce electricity demand at peak times, which reduces generation from the
              most polluting plants on the grid.
            </li>
            <li>
              Never pour paint, solvents, motor oil or medicines down a drain — most
              drainage reaches surface water with little or no treatment.
            </li>
            <li>
              Use fertiliser and pesticide sparingly. Runoff is the main driver of the
              nutrient loading that causes algal blooms and oxygen depletion.
            </li>
          </ul>

          <h3>Institutional and community</h3>
          <ul>
            <li>
              Pave or green exposed soil surfaces, and keep construction material
              covered and damped down. Dust control is one of the cheapest effective
              particulate measures.
            </li>
            <li>
              Plant and maintain trees and vegetated buffers along roads and
              watercourses, which trap dust and intercept runoff before it reaches the
              water.
            </li>
            <li>
              Repair leaking sewerage. Untreated sewage entering a river is usually the
              single largest cause of the low dissolved oxygen readings seen in urban
              reaches.
            </li>
            <li>
              Segregate waste so that organic material is composted rather than burned
              or landfilled.
            </li>
            <li>
              Harvest rainwater, which reduces both groundwater extraction and the
              volume of runoff carrying pollutants into surface water.
            </li>
          </ul>

          <h3>Why monitoring itself matters</h3>
          <p>
            Measurement is not an alternative to action, but action without measurement
            cannot be evaluated. A record of where and when conditions are worst is what
            turns a general concern into a specific, arguable case — which is the point
            of a system like this one.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Protecting yourself on a high-AQI day" />
        <CardBody className="prose-section">
          <ul>
            <li>
              Check the index before outdoor exercise and move hard exertion to a time
              when the index is lower — typically the early afternoon in cities where
              particulates peak around the traffic rush.
            </li>
            <li>
              Keep windows closed when outdoor levels are high, and open them when
              levels drop.
            </li>
            <li>
              Avoid adding indoor sources — smoking, incense, unvented burning.
            </li>
            <li>
              A properly fitted particulate-filtering respirator reduces particulate
              exposure; a loose cloth covering does not.
            </li>
            <li>
              If you have a heart or lung condition, follow the plan your own doctor has
              given you. The categories in this application are general information
              only.
            </li>
          </ul>
        </CardBody>
      </Card>
    </Panel>
  )
}
