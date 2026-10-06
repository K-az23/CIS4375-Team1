export default function ServiceList({ services }) {
  return (
    <div className="service-list">
      {services.map((service) => (
        <div key={service.name} className="service-row">
          <div>
            <div className="service-row__name">{service.name}</div>
            {service.duration && <div className="service-row__meta">{service.duration}</div>}
          </div>
          <div className="service-row__price">{service.price}</div>
          {service.description && <p className="service-row__desc">{service.description}</p>}
        </div>
      ))}
    </div>
  );
}