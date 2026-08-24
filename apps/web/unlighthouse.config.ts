export default {
  site: "http://localhost:3000",
  server: {
    port: 9000,
    open: true,
  },
  scanner: {
    throttle: true,
    samples: 1,
  },
  puppeteerOptions: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
};
