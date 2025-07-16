
'use client';

export function DownloadButton() {
  return (
    <a href="https://drive.google.com/file/d/1rw5sG8s3iU3JU8a0zvi6ROeVxq0UtKtg/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="ms-container" title="Unduh APK">
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
