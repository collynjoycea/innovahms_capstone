// Add to your router (same pattern as your /owner routes). Adjust the layout/guard names to yours.
import ManagerLogin from './pages/manager/ManagerLogin';
import ManagerSignUp from './pages/manager/ManagerSignUp';
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerRooms from './pages/manager/Rooms';
import ManagerReservations from './pages/manager/Reservations';
import ManagerCustomers from './pages/manager/Customers';
import ManagerStaff from './pages/manager/Staff';
import ManagerReports from './pages/manager/Reports';
import ManagerInventory from './pages/manager/Inventory';
import ManagerHousekeeping from './pages/manager/Housekeeping';
import ManagerReviews from './pages/manager/Reviews';
import ManagerProfile from './pages/manager/Profile';

<Route path="/manager/login" element={<ManagerLogin />} />
<Route path="/manager/signup" element={<ManagerSignUp />} />
<Route path="/manager" element={<ManagerLayout />}>   {/* copy of OwnerLayout; read managerSession + clear it on logout */}
  <Route index element={<ManagerDashboard />} />
  <Route path="rooms" element={<ManagerRooms />} />
  <Route path="reservations" element={<ManagerReservations />} />
  <Route path="customers" element={<ManagerCustomers />} />
  <Route path="staff" element={<ManagerStaff />} />
  <Route path="reports" element={<ManagerReports />} />
  <Route path="inventory" element={<ManagerInventory />} />
  <Route path="housekeeping" element={<ManagerHousekeeping />} />
  <Route path="reviews" element={<ManagerReviews />} />
  <Route path="profile" element={<ManagerProfile />} />
</Route>
