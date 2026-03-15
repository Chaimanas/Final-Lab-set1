const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
app.set('trust proxy', 1); // Trust nginx proxy for rate limiting
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));