import DashboardHeader from '../../components/DashboardHeader';
import Panel from '../../components/Panel';
import SpecList from '../../components/SpecList';
import { business } from '../../data/business';

export default function AdminSettings() {
  // There is no API for saving notification preferences yet. Show the
  // information without pretending that a form has saved settings.
  return (
    <>
      <DashboardHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Notifications and business details."
      />

      <div className="two-col" style={{ alignItems: 'start' }}>
        <Panel title="Notifications">
          <div className="stack" style={{ marginTop: 12 }}>
            <p>
              Contact messages and password-reset emails use the email
              service configured on the server.
            </p>

            <p className="muted">
              Notification preferences cannot be changed on this page
              yet. Ask the project administrator to update the server
              settings.
            </p>

            <p className="field-hint">
              The public business email below may differ from the
              configured notification inbox.
            </p>
          </div>
        </Panel>

        <Panel title="Business details">
          <SpecList
            rows={[
              ['Name', business.name],
              ['Email', business.email],
              ['Address', business.addressLine1],
              ['', business.addressLine2],
              ['Booking', 'Setmore'],
              ...business.hours.map((hour) => [hour.days, hour.time]),
            ]}
          />
        </Panel>
      </div>
    </>
  );
}