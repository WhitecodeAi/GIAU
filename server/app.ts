import { createServer } from './index.js';

const PORT = process.env.PORT || 3001;

const app = createServer();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
