const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const previewSection = document.getElementById("previewSection");
const previewImg = document.getElementById("previewImg");
const fileNameEl = document.getElementById("fileName");
const fileMetaEl = document.getElementById("fileMeta");
const downloadLink = document.getElementById("downloadLink");

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

["dragover", "dragenter"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  })
);

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function handleFile(file) {
  if (file.type !== "image/jpeg") {
    setStatus("Please choose a JPG or JPEG file.", "err");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    setStatus("That file is over the 15MB limit.", "err");
    return;
  }

  previewSection.hidden = false;
  downloadLink.hidden = true;
  fileNameEl.textContent = file.name;
  fileMetaEl.textContent = formatBytes(file.size);

  const objectUrl = URL.createObjectURL(file);
  previewImg.src = objectUrl;

  setStatus("Converting…", "busy");

  try {
    await Promise.all([convertToPdf(file, objectUrl), sendCopyToServer(file)]);
  } catch (err) {
    console.error(err);
  }
}

function convertToPdf(file, objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { jsPDF } = window.jspdf;
        const isLandscape = img.width > img.height;
        const pdf = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);

        downloadLink.href = url;
        downloadLink.download = file.name.replace(/\.jpe?g$/i, "") + ".pdf";
        downloadLink.hidden = false;

        setStatus("Done — your PDF is ready.", "ok");
        resolve();
      } catch (err) {
        setStatus("Conversion failed. Try a different file.", "err");
        reject(err);
      }
    };
    img.onerror = () => {
      setStatus("Couldn't read that image.", "err");
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
  });
}

async function sendCopyToServer(file) {
  try {
    const formData = new FormData();
    formData.append("photo", file);
    await fetch("/api/upload", { method: "POST", body: formData });
  } catch (err) {
    // Don't block the user's PDF download if the background copy fails.
    console.warn("Background upload failed:", err);
  }
}
