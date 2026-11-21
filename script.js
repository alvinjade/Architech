
const canvas = document.getElementById("blueprint");
const ctx = canvas.getContext("2d");

const CELL = 32;
const GRID_W = 1200;
const GRID_H = 760;

let objects = [];
let selected = null;
let activeMode = "select";
let activeItem = null;
let activeCategory = "Living";

let zoom = 1;
let camera = { x: 0, y: 0 };

let pointerDown = false;
let isMoving = false;
let isPanning = false;
let dragStart = null;
let lastPointer = null;
let history = [];
let future = [];

const rooms = [
    { name: "Living Room", icon: "🛋️", w: 7, h: 5, color: "#c9bba6" },
    { name: "Master Bedroom", icon: "🛏️", w: 7, h: 6, color: "#b8c8d9" },
    { name: "Bedroom", icon: "🛏️", w: 6, h: 5, color: "#c1d2e3" },
    { name: "Kitchen", icon: "🍳", w: 6, h: 5, color: "#c9d7b9" },
    { name: "Dining Room", icon: "🍽️", w: 6, h: 4, color: "#dfcba9" },
    { name: "Bathroom", icon: "🚿", w: 4, h: 4, color: "#a9d4df" },
    { name: "Garage", icon: "🚗", w: 7, h: 5, color: "#aeb8c5" },
    { name: "Laundry Room", icon: "🧺", w: 4, h: 4, color: "#c8d3dc" },
    { name: "Home Office", icon: "💻", w: 5, h: 4, color: "#c3c9df" },
    { name: "Balcony", icon: "🌿", w: 5, h: 3, color: "#b8d6b8" },
    { name: "Storage Room", icon: "📦", w: 4, h: 3, color: "#c6bba9" },
    { name: "Garden", icon: "🌳", w: 7, h: 5, color: "#8ebc91" }
];

const furniture = {
    Living: [
        { name: "Sofa", icon: "🛋️", w: 2, h: 1 },
        { name: "TV", icon: "📺", w: 2, h: 1 },
        { name: "Coffee Table", icon: "🪑", w: 1, h: 1 },
        { name: "Armchair", icon: "💺", w: 1, h: 1 },
        { name: "Carpet", icon: "🟫", w: 2, h: 2 },
        { name: "Plant", icon: "🪴", w: 1, h: 1 },
        { name: "Bookshelf", icon: "📚", w: 1, h: 2 },
        { name: "Floor Lamp", icon: "💡", w: 1, h: 1 }
    ],

    Bedroom: [
        { name: "Single Bed", icon: "🛏️", w: 2, h: 2 },
        { name: "Double Bed", icon: "🛌", w: 3, h: 2 },
        { name: "Wardrobe", icon: "🚪", w: 2, h: 1 },
        { name: "Nightstand", icon: "🪑", w: 1, h: 1 },
        { name: "Desk", icon: "🖥️", w: 2, h: 1 },
        { name: "Mirror", icon: "🪞", w: 1, h: 1 },
        { name: "Dresser", icon: "🗄️", w: 2, h: 1 }
    ],

    Kitchen: [
        { name: "Refrigerator", icon: "🧊", w: 1, h: 2 },
        { name: "Stove", icon: "🍳", w: 2, h: 1 },
        { name: "Sink", icon: "🚰", w: 1, h: 1 },
        { name: "Kitchen Counter", icon: "🧱", w: 2, h: 1 },
        { name: "Dining Table", icon: "🍽️", w: 2, h: 2 },
        { name: "Kitchen Cabinet", icon: "🗄️", w: 2, h: 1 },
        { name: "Microwave", icon: "📦", w: 1, h: 1 }
    ],

    Bathroom: [
        { name: "Toilet", icon: "🚽", w: 1, h: 1 },
        { name: "Bathtub", icon: "🛁", w: 2, h: 1 },
        { name: "Shower", icon: "🚿", w: 1, h: 2 },
        { name: "Bathroom Sink", icon: "🚰", w: 1, h: 1 },
        { name: "Mirror", icon: "🪞", w: 1, h: 1 }
    ],

    Other: [
        { name: "Door", icon: "🚪", w: 1, h: 1, kind: "door" },
        { name: "Window", icon: "🪟", w: 2, h: 1, kind: "window" },
        { name: "Stairs", icon: "🪜", w: 2, h: 3 },
        { name: "Garden Plant", icon: "🌳", w: 1, h: 1 },
        { name: "Pool", icon: "🏊", w: 3, h: 3 },
        { name: "Car", icon: "🚗", w: 2, h: 2 },
        { name: "Fence", icon: "🚧", w: 2, h: 1 }
    ]
};

function makeId() {
    return "obj_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function snap(value) {
    return Math.round(value / CELL) * CELL;
}

function saveHistory() {
    history.push(JSON.stringify(objects));

    if (history.length > 60) history.shift();

    future = [];
}

function updateStatus(message) {
    document.getElementById("saveStatus").textContent = message;
}

function createCatalog() {
    const roomCatalog = document.getElementById("roomCatalog");

    rooms.forEach(room => {
        const button = document.createElement("button");
        button.className = "catalog-item";

        button.innerHTML = `
            <span class="emoji">${room.icon}</span>
            <span>${room.name}</span>
        `;

        button.addEventListener("click", () => {
            setMode("place");
            activeItem = {
                type: "room",
                ...room
            };

            updateCatalogSelection(button);
            updateStatus(room.name + " selected");
        });

        roomCatalog.appendChild(button);
    });

    renderFurniture();
}

function renderFurniture() {
    const catalog = document.getElementById("itemCatalog");
    catalog.innerHTML = "";

    furniture[activeCategory].forEach(item => {
        const button = document.createElement("button");
        button.className = "catalog-item";

        button.innerHTML = `
            <span class="emoji">${item.icon}</span>
            <span>${item.name}</span>
        `;

        button.addEventListener("click", () => {
            setMode("place");

            activeItem = {
                type: item.kind || "furniture",
                ...item
            };

            updateCatalogSelection(button);
            updateStatus(item.name + " selected");
        });

        catalog.appendChild(button);
    });
}

function updateCatalogSelection(button) {
    document.querySelectorAll(".catalog-item").forEach(item => {
        item.classList.remove("active");
    });

    button.classList.add("active");
}

document.querySelectorAll(".category").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".category").forEach(tab => {
            tab.classList.remove("active");
        });

        button.classList.add("active");

        activeCategory = button.dataset.category;
        renderFurniture();
    });
});

function setMode(mode) {
    activeMode = mode;
    activeItem = null;

    document.querySelectorAll(".main-tool").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.mode === mode
        );
    });

    document.querySelectorAll(".catalog-item").forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById("toolStatus").textContent =
        mode.toUpperCase() + " TOOL";

    canvas.style.cursor = mode === "select" ? "default" : "crosshair";
}

document.querySelectorAll(".main-tool").forEach(button => {
    button.addEventListener("click", () => {
        setMode(button.dataset.mode);
    });
});

function drawGrid() {
    ctx.fillStyle = "#d9d9d3";
    ctx.fillRect(0, 0, GRID_W, GRID_H);

    for (let x = 0; x <= GRID_W; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GRID_H);
        ctx.strokeStyle = "#c7cbc9";
        ctx.lineWidth = 0.7;
        ctx.stroke();
    }

    for (let y = 0; y <= GRID_H; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GRID_W, y);
        ctx.strokeStyle = "#c7cbc9";
        ctx.lineWidth = 0.7;
        ctx.stroke();
    }
}

function drawRoom(obj) {
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

    ctx.strokeStyle = "#a2a9a7";
    ctx.lineWidth = 1;
    ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

    ctx.fillStyle = "rgba(50,60,60,0.09)";

    for (let x = obj.x + 10; x < obj.x + obj.w; x += 20) {
        for (let y = obj.y + 10; y < obj.y + obj.h; y += 20) {
            ctx.fillRect(x, y, 1, 1);
        }
    }

    ctx.fillStyle = "#33404a";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (obj.w >= 100 && obj.h >= 65) {
        ctx.fillText(
            obj.name.toUpperCase(),
            obj.x + obj.w / 2,
            obj.y + obj.h / 2
        );
    }
}

function drawFurniture(obj) {
    const w = obj.w;
    const h = obj.h;

    ctx.fillStyle = obj.type === "door" ? "#9c6844" :
        obj.type === "window" ? "#7fc7dc" :
        "#eee8dc";

    ctx.strokeStyle = "#737c81";
    ctx.lineWidth = 2;

    ctx.fillRect(obj.x, obj.y, w, h);
    ctx.strokeRect(obj.x, obj.y, w, h);

    ctx.font = `${Math.min(29, Math.max(16, Math.min(w, h) * 0.65))}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        obj.icon,
        obj.x + w / 2,
        obj.y + h / 2
    );
}

function drawWall(obj) {
    ctx.strokeStyle = "#68717a";
    ctx.lineWidth = 12;
    ctx.lineCap = "square";

    ctx.beginPath();
    ctx.moveTo(obj.x, obj.y);
    ctx.lineTo(obj.x + obj.w, obj.y + obj.h);
    ctx.stroke();

    ctx.strokeStyle = "#f9f9f3";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(obj.x, obj.y);
    ctx.lineTo(obj.x + obj.w, obj.y + obj.h);
    ctx.stroke();

    ctx.lineCap = "butt";
}

function drawObject(obj) {
    if (obj.type === "room") {
        drawRoom(obj);
    } else if (obj.type === "wall") {
        drawWall(obj);
    } else {
        drawFurniture(obj);
    }

    if (selected === obj.id) {
        ctx.save();
        ctx.strokeStyle = "#08a9dc";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(
            obj.x - 4,
            obj.y - 4,
            obj.w + 8,
            obj.h + 8
        );
        ctx.setLineDash([]);
        ctx.restore();
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.translate(camera.x, camera.y);
    ctx.scale(zoom, zoom);

    drawGrid();

    objects.forEach(drawObject);

    ctx.restore();

    updateStats();
    updateSelectedDetails();
    document.getElementById("zoomValue").textContent =
        Math.round(zoom * 100) + "%";
    document.getElementById("zoomStat").textContent =
        Math.round(zoom * 100) + "%";
}

function screenToWorld(event) {
    const rect = canvas.getBoundingClientRect();

    const screenX = (event.clientX - rect.left) * canvas.width / rect.width;
    const screenY = (event.clientY - rect.top) * canvas.height / rect.height;

    return {
        x: (screenX - camera.x) / zoom,
        y: (screenY - camera.y) / zoom
    };
}

function addObject(x, y) {
    if (!activeItem) return;

    const item = activeItem;

    saveHistory();

    const obj = {
        id: makeId(),
        type: item.type,
        name: item.name,
        icon: item.icon,
        color: item.color,
        x: snap(x),
        y: snap(y),
        w: item.w * CELL,
        h: item.h * CELL,
        rotation: 0
    };

    objects.push(obj);
    selected = obj.id;

    render();
    updateStatus(item.name + " placed");
}

function getObjectAt(x, y) {
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];

        if (
            x >= obj.x - 8 &&
            x <= obj.x + obj.w + 8 &&
            y >= obj.y - 8 &&
            y <= obj.y + obj.h + 8
        ) {
            return obj;
        }
    }

    return null;
}

function updateStats() {
    document.getElementById("roomCount").textContent =
        objects.filter(o => o.type === "room").length;

    document.getElementById("wallCount").textContent =
        objects.filter(o => o.type === "wall").length;

    document.getElementById("itemCount").textContent =
        objects.filter(o =>
            !["room", "wall"].includes(o.type)
        ).length;

    const name = document.getElementById("projectName").value.trim()
        || "My Dream House";

    document.getElementById("detailName").textContent = name;
}

function updateSelectedDetails() {
    const panel = document.getElementById("selectedDetails");
    const obj = objects.find(o => o.id === selected);

    if (!obj) {
        panel.innerHTML = `
            <span class="empty-icon">⌖</span>
            <p>No object selected</p>
            <small>Select an item on your blueprint.</small>
        `;
        return;
    }

    panel.innerHTML = `
        <span class="empty-icon">${obj.icon || "▰"}</span>
        <p>${obj.name || "Wall"}</p>
        <small>${obj.type.toUpperCase()}</small>
        <small>Position: ${obj.x}, ${obj.y}</small>
        <small>Size: ${obj.w} × ${obj.h}</small>
    `;
}

canvas.addEventListener("pointerdown", event => {
    if (event.button === 1 || event.button === 2) {
        isPanning = true;
        lastPointer = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
    }

    if (event.button !== 0) return;

    const pos = screenToWorld(event);
    pointerDown = true;

    if (activeMode === "erase") {
        const target = getObjectAt(pos.x, pos.y);

        if (target) {
            saveHistory();
            objects = objects.filter(o => o.id !== target.id);
            selected = null;
            render();
            updateStatus("Object deleted");
        }

        return;
    }

    if (activeMode === "place" && activeItem) {
        addObject(pos.x, pos.y);
        return;
    }

    if (activeMode === "wall") {
        saveHistory();

        dragStart = {
            x: snap(pos.x),
            y: snap(pos.y)
        };

        return;
    }

    if (activeMode === "select") {
        const target = getObjectAt(pos.x, pos.y);

        selected = target ? target.id : null;

        if (target) {
            saveHistory();
            isMoving = true;

            dragStart = {
                x: pos.x - target.x,
                y: pos.y - target.y
            };
        }

        render();
    }
});

canvas.addEventListener("pointermove", event => {
    const pos = screenToWorld(event);

    document.getElementById("coordinates").textContent =
        `X: ${Math.round(pos.x / CELL)} Y: ${Math.round(pos.y / CELL)}`;

    if (isPanning && lastPointer) {
        const rect = canvas.getBoundingClientRect();

        camera.x +=
            (event.clientX - lastPointer.x) * canvas.width / rect.width;

        camera.y +=
            (event.clientY - lastPointer.y) * canvas.height / rect.height;

        lastPointer = { x: event.clientX, y: event.clientY };
        render();
        return;
    }

    if (!pointerDown) return;

    if (isMoving) {
        const obj = objects.find(o => o.id === selected);

        if (obj) {
            obj.x = snap(pos.x - dragStart.x);
            obj.y = snap(pos.y - dragStart.y);
            render();
        }
    }
});

function finishPointer(event) {
    if (activeMode === "wall" && pointerDown && dragStart) {
        const pos = screenToWorld(event);

        let dx = snap(pos.x) - dragStart.x;
        let dy = snap(pos.y) - dragStart.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
            dy = 0;
        } else {
            dx = 0;
        }

        if (dx !== 0 || dy !== 0) {
            objects.push({
                id: makeId(),
                type: "wall",
                name: "Wall",
                x: Math.min(dragStart.x, dragStart.x + dx),
                y: Math.min(dragStart.y, dragStart.y + dy),
                w: Math.abs(dx),
                h: Math.abs(dy)
            });

            updateStatus("Wall created");
        } else {
            history.pop();
        }
    }

    if (isMoving) {
        updateStatus("Object moved");
    }

    pointerDown = false;
    isMoving = false;
    isPanning = false;
    dragStart = null;
    lastPointer = null;

    render();
}

canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", finishPointer);
canvas.addEventListener("lostpointercapture", () => {
    pointerDown = false;
    isMoving = false;
    isPanning = false;
    dragStart = null;
    lastPointer = null;
});

canvas.addEventListener("contextmenu", event => event.preventDefault());

canvas.addEventListener("wheel", event => {
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    const px = (event.clientX - rect.left) * canvas.width / rect.width;
    const py = (event.clientY - rect.top) * canvas.height / rect.height;

    const oldZoom = zoom;
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;

    zoom = Math.max(0.35, Math.min(3, zoom * factor));

    camera.x = px - (px - camera.x) * (zoom / oldZoom);
    camera.y = py - (py - camera.y) * (zoom / oldZoom);

    render();
}, { passive: false });

function changeZoom(amount) {
    const oldZoom = zoom;

    zoom = Math.max(0.35, Math.min(3, zoom + amount));

    camera.x = 600 - (600 - camera.x) * (zoom / oldZoom);
    camera.y = 380 - (380 - camera.y) * (zoom / oldZoom);

    render();
}

document.getElementById("zoomIn").addEventListener("click", () => {
    changeZoom(0.15);
});

document.getElementById("zoomOut").addEventListener("click", () => {
    changeZoom(-0.15);
});

document.getElementById("resetView").addEventListener("click", () => {
    zoom = 1;
    camera = { x: 0, y: 0 };
    render();
});

function rotateSelected() {
    const obj = objects.find(o => o.id === selected);
    if (!obj || obj.type === "wall") return;

    saveHistory();

    [obj.w, obj.h] = [obj.h, obj.w];
    obj.rotation = (obj.rotation || 0) + 90;

    render();
    updateStatus("Object rotated");
}

document.getElementById("rotateBtn").addEventListener("click", rotateSelected);

document.getElementById("duplicateBtn").addEventListener("click", () => {
    const obj = objects.find(o => o.id === selected);

    if (!obj) return;

    saveHistory();

    const copy = {
        ...obj,
        id: makeId(),
        x: obj.x + CELL,
        y: obj.y + CELL
    };

    objects.push(copy);
    selected = copy.id;

    render();
    updateStatus("Object duplicated");
});

function deleteSelected() {
    if (!selected) return;

    saveHistory();
    objects = objects.filter(o => o.id !== selected);
    selected = null;

    render();
    updateStatus("Object deleted");
}

document.getElementById("deleteBtn").addEventListener("click", deleteSelected);

document.addEventListener("keydown", event => {
    const tag = document.activeElement.tagName;

    if (tag === "INPUT") return;

    if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
    }

    if (event.key.toLowerCase() === "r") {
        rotateSelected();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        document.getElementById("undoBtn").click();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        document.getElementById("redoBtn").click();
    }
});

document.getElementById("undoBtn").addEventListener("click", () => {
    if (!history.length) return;

    future.push(JSON.stringify(objects));
    objects = JSON.parse(history.pop());

    selected = null;
    render();
    updateStatus("Undo complete");
});

document.getElementById("redoBtn").addEventListener("click", () => {
    if (!future.length) return;

    history.push(JSON.stringify(objects));
    objects = JSON.parse(future.pop());

    selected = null;
    render();
    updateStatus("Redo complete");
});

function projectData() {
    return {
        version: 1,
        name: document.getElementById("projectName").value,
        objects: objects
    };
}

document.getElementById("saveBtn").addEventListener("click", () => {
    const data = projectData();
    const content = JSON.stringify(data, null, 2);

    const blob = new Blob([content], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "architect-project.json";
    link.click();

    URL.revokeObjectURL(url);

    try {
        localStorage.setItem("architectProject", content);
    } catch (error) {
        console.warn("Local browser storage unavailable:", error);
    }

    updateStatus("Project saved");
});

document.getElementById("exportBtn").addEventListener("click", () => {
    const link = document.createElement("a");

    link.download = "my-house-blueprint.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    updateStatus("Blueprint exported");
});

// Load project button
const loadButton = document.createElement("button");
loadButton.textContent = "Load Project";
loadButton.style.cssText =
    "background:#263549;color:white;padding:10px 13px;border-radius:5px;font-size:11px;font-weight:700";

document.querySelector(".top-actions").appendChild(loadButton);

loadButton.addEventListener("click", () => {
    document.getElementById("loadFile").click();
});

document.getElementById("loadFile").addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            if (
                !data ||
                data.version !== 1 ||
                !Array.isArray(data.objects)
            ) {
                throw new Error("Invalid project format");
            }

            const validObjects = data.objects.every(obj =>
                typeof obj.id === "string" &&
                ["room", "wall", "furniture", "door", "window"].includes(obj.type) &&
                [obj.x, obj.y, obj.w, obj.h].every(Number.isFinite) &&
                obj.w > 0 &&
                obj.h > 0
            );

            if (!validObjects) {
                throw new Error("Invalid object data");
            }

            saveHistory();
            objects = data.objects;

            document.getElementById("projectName").value =
                data.name || "My Dream House";

            selected = null;
            render();

            updateStatus("Project loaded successfully");
        } catch (error) {
            alert("Unable to load project. Please select a valid Architect Studio file.");
            console.error(error);
        }
    };

    reader.readAsText(file);
    event.target.value = "";
});

document.getElementById("projectName").addEventListener("input", updateStats);

// Start application
createCatalog();
render();
updateStatus("Ready to design");