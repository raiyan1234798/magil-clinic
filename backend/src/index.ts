import { createApp } from './app';
import { prisma } from './prisma';
import { migrateLegacyAppointmentTokens } from './migrate-legacy-data';

migrateLegacyAppointmentTokens();

const app = createApp(prisma);
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
