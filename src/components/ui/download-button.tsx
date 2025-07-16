
'use client';

export function DownloadButton() {
  return (
    <a href="/absensi.apk" download="absensi.apk" className="ms-container" title="Unduh APK">
      <label htmlFor="ms-download" className="cursor-pointer">
        <div className="ms-content">
          <div className="ms-content-inside">
            <input type="checkbox" id="ms-download" />
            <div className="ms-line-down-container">
              <div className="ms-line-down"></div>
            </div>
            <div className="ms-line-point"></div>
          </div>
        </div>
      </label>
    </a>
  );
}
