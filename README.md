# BMS_STOCK

BMS_STOCK is a Vue 3 and Vuetify inventory and warehouse management application with a Go API.

## Development

```bash
npm install
npm run dev
```

Run a production build with:

```bash
npm run build
npm run preview
```

## Localization

The interface supports English and French through Vue I18n. The selected language is stored in browser local storage under `bms_stock_language`.

## PWA

The production build includes a web app manifest, installable icons, and an offline application shell managed by the service worker in `public/sw.js`.

## API

The Go API is located in `bms-api`. Configure the frontend API URL with `VITE_API_URL` before starting the application.

## License

See [LICENSE](LICENSE).