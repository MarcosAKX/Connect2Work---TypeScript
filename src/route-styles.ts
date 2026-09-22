// Keep the existing cascade eager and ordered. Loading these styles with each
// lazy page would make shared selectors depend on the user's navigation order.
// This phase splits JavaScript only; CSS optimization is a separate task.
import './assets/css/pages/admin-dashboard.css';
import './assets/css/pages/admin-units.css';
import './assets/css/pages/admin-rooms.css';
import './assets/css/pages/admin-bookings.css';
import './assets/css/pages/admin-operations-polish.css';
import './assets/css/pages/admin-daily-panel.css';
import './assets/css/pages/admin-users.css';
import './assets/css/pages/admin-tasks.css';
import './assets/css/pages/admin-hours-plan.css';
import 'leaflet/dist/leaflet.css';
import './assets/css/pages/admin-governance.css';
import './assets/css/pages/admin-business-services.css';
import './assets/css/pages/system-pages.css';
