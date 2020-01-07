# device-auto-sync-with-service-worker

A simple demo of how to automatically sync data across multiple devices for offline usage, using web technologies.  
Inspired by Google Sync.

<!-- Remix Button -->
<a href="https://glitch.com/edit/?utm_content=project_iagobruno-device-auto-sync-with-service-worker&utm_source=remix_this&utm_medium=button&utm_campaign=glitchButton#!/remix/iagobruno-device-auto-sync-with-service-worker">
  <img src="https://cdn.glitch.com/2bdfb3f8-05ef-4035-a06e-2043962a3a13%2Fremix%402x.png?1513093958726" alt="remix this" height="33">
</a>

## Goals

- [x] Allow user to use the web app on multiple devices and make changes even offline.
- [x] Sync local changes with server when reconnect.
- [x] Ensure all user devices always have the most up-to-date data.

## Flowchart

![flowchart.png](/public/flowchart.png)

## Installation

```
git clone https://github.com/iagobruno/device-auto-sync-with-service-worker.git
cd device-auto-sync-with-service-worker
yarn install
node server.js
```

## Improvement Ideas

For when you are making your own implementation.

- Use a [debounced function](https://lodash.com/docs/4.17.15#debounce) on the server to avoid sending too many syncs to the user's device.
- Use a [queue plugin](https://github.com/OptimalBits/bull) to not reach the rate limit of push service.
- Handle content conflicts.

## Related Contents

- [Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers).
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
- [Background Sync](https://developers.google.com/web/updates/2015/12/background-sync).
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).
- [Fetch API](https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API/Using_Fetch).

## License

MIT License.
