const app = require("./app");
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend API listening on http://0.0.0.0:${PORT}/api/v1`);
});
