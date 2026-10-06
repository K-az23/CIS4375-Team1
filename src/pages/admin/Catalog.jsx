import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import ServiceList from '../../components/ServiceList';
import SpecList from '../../components/SpecList';
import { serviceCategories } from '../../data/services';
import { hairOptions, pricing, specFields, formatSpec } from '../../data/hairOptions';

export default function Catalog() {
  const optionRows = specFields.map((f) => [f.label, hairOptions[f.key].map((v) => formatSpec(f.key, v)).join(', ')]);

  return (
    <>
      <DashboardHeader eyebrow="Website content" title="Catalog" subtitle="Services and hair system options shown on the website." showIcons />
      <div className="page-stack">
        <div className="two-col">
          <Panel title="Hair system options">
            <SpecList rows={optionRows} />
          </Panel>
          <Panel title="Hair system pricing">
            <SpecList rows={[
              ['Hair loss area system (online)', `$${pricing.areaSystem}`],
              ['Long hair extra', pricing.longHairExtra ? `$${pricing.longHairExtra}` : 'To be confirmed'],
              ['Full custom system (invoice)', `From $${pricing.customFrom}`],
              ['Delivery to salon', `About ${pricing.shippingDays} days`],
            ]} />
          </Panel>
        </div>
        <div className="report-grid">
          {serviceCategories.map((c) => (
            <Panel key={c.id} title={c.heading}><ServiceList services={c.services} /></Panel>
          ))}
        </div>
      </div>
    </>
  );
}