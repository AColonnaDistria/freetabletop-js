var gameState = {
    availableAssets: [],
    maxUUIDAsset: 1,
    assets: [],
    history: {"snapshots": [], "delta": [], "position": 0},
    assetLocationDefault: {"x": 50, "y": 50},
    currentDrag: null,
    maxZIndex: 1,

    assetLocationDefaultDelta: {"x": 10, "y": 10},
};

const canvas = document.getElementById("hiddenCanvas");
const ctx = canvas.getContext("2d");

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function bringAssetToFront(asset) {
    // Bring to front
    asset.stackOrder = gameState.maxZIndex;
    asset.htmlElement.style.zIndex = asset.stackOrder;
    gameState.maxZIndex++;
}

function flipAsset(asset) {
    let assetStyle = asset.styles.find(item => item.id === asset.selectedStyleId);
    console.log(assetStyle);
    let assetSprite = assetStyle;
    if (asset.type == "multiple_flippable") {
        assetSprite = assetStyle.sprites.find(item => item.id === asset.spriteId);
    }

    asset.flipStatus = (asset.flipStatus == 'back') ? 'front' : 'back';
    let sprite = (asset.flipStatus == 'front') ? assetSprite.image : assetSprite.image_flip;

    asset.htmlElement.src = `/assets/${sprite}`;

    bringAssetToFront(asset);
}

function getAssetsUnderPoint(x, y) {
    return gameState.assets
        .filter(asset => {
            const rect = asset.htmlElement.getBoundingClientRect();
            return (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            );
        })
        .sort((a, b) => b.stackOrder - a.stackOrder); // top-most first
}

function makeAsset(asset_id, location, size, style, flip, sprite_id) {
    let asset = structuredClone(gameState.availableAssets.find(item => item.id === asset_id));
    
    asset.selectedStyleId = (!style) ? (asset.styles[0].id) : style;

    asset.uuid = gameState.maxUUIDAsset;
    gameState.maxUUIDAsset++;

    if (!location) {
        asset.location = {"x": gameState.assetLocationDefault.x, "y": gameState.assetLocationDefault.y};

        gameState.assetLocationDefault.x += gameState.assetLocationDefaultDelta.x;
        gameState.assetLocationDefault.y += gameState.assetLocationDefaultDelta.y;
    }
    else {
        asset.location = {"x": location.x, "y": location.y};
    }

    if (!size) {
        asset.size = {"w": asset.defaultWidth, "h": asset.defaultHeight};
    }
    else {
        asset.size = {"w": size.w, "h": size.h};
    }

    asset.htmlElement = document.createElement("img");
    asset.htmlElement.classList.add("asset-element");

    asset.htmlElement.style.width = `${asset.size.w}px`;
    asset.htmlElement.style.height = `${asset.size.h}px`;

    asset.htmlElement.style.left = `${asset.location.x}px`;
    asset.htmlElement.style.top = `${asset.location.y}px`;

    bringAssetToFront(asset);

    let assetStyle = asset.styles.find(item => item.id === asset.selectedStyleId);
    let assetSprite = assetStyle;
    if (asset.type == "multiple_flippable" || asset.type == "multiple" || asset.type == "multiple_random") {
        asset.spriteId = sprite_id;
        assetSprite = assetStyle.sprites.find(item => item.id === asset.spriteId);
    }

    switch (asset.type) {
        case 'static':
        case 'multiple':
            asset.htmlElement.src = `/assets/${assetSprite.image}`;
            break;
        case 'flippable':
        case 'multiple_flippable':
            asset.flipStatus = (!flip) ? 'front' : 'back';
            let sprite = (asset.flipStatus == 'front') ? assetSprite.image : assetSprite.image_flip;

            asset.htmlElement.src = `/assets/${sprite}`;
            asset.htmlElement.addEventListener("dblclick", (event) => {
                event.preventDefault();

                flipAsset(asset);
                saveFlipToHistory(asset.uuid);
            });
            break;
        case 'multiple_random':
            asset.htmlElement.src = `/assets/${assetSprite.image}`;
            
            asset.htmlElement.addEventListener("dblclick", (event) => {
                let totalWeight = assetStyle.sprites.reduce((sum, sp) => sum + sp.weight, 0);

                const rand = Math.random() * totalWeight;
                let cumulative = 0;
                for (const sp of assetStyle.sprites) {
                    cumulative += sp.weight;
                    if (rand < cumulative) {
                        asset.spriteId = sp.id;
                        asset.htmlElement.src = `assets/${sp.image}`;            
                        break;
                    }
                }
            });
            break;
    }

    asset.htmlElement.addEventListener("mousedown", (event) => {
        event.preventDefault();
    });
    
    document.body.appendChild(asset.htmlElement);

    gameState.assets.push(asset);

    return asset;
}

function makeStack(asset_id, location, size, style, flip, sprites_id, shuffle) {
    let asset = gameState.availableAssets.find(item => item.id === asset_id);

    if (asset.type == "multiple" || asset.type == "multiple_flippable" || asset.type == "multiple_random") {
        if (!sprites_id) {
            sprites_id = asset.styles.find(item => item.id === style).sprites;
        }

        if (!location) {
            location = {"x": gameState.assetLocationDefault.x, "y": gameState.assetLocationDefault.y};
        }

        if (shuffle) {
            shuffleArray(sprites_id);
        }

        for (let sprite_id of sprites_id) {
            makeAsset(asset_id, location, size, style, flip, sprite_id.id);
        }
    }
}

function presentCardgame() {
    makeStack("card", null, null, "default", true, null, true);
}

function presentPoker() {
    makeStack("card", {"x": 100, "y": 300}, null, "default", true, null, true);

    let tokens = ["token_1", "token_5", "token_25", "token_100", "token_500", "token_1000"]
    for (let tokenIndex = 0; tokenIndex < tokens.length; ++tokenIndex) {
        let x_pos = 500 + (tokenIndex) * 125;
        let y_pos = 800;

        for (let i = 0; i < 4; ++i) {
            makeAsset("token", {"x": x_pos + i * 7, "y": y_pos}, {"w": 100, "h": 100}, "default", null, tokens[tokenIndex]);
        }
    }
}

function presentChess() {
    let scale = 0.75;

    let posX = 450;
    let posY = 100;

    let border = 80.0 * scale;

    let caseSize = 108 * scale;

    makeAsset("chessboard", {"x": posX, "y": posY}, {"w": caseSize * 8.0 + border * 2.0, "h": caseSize * 8.0 + border * 2.0}, "marble", null, null);

    let pieces = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

    for (let i = 0; i < 8; ++i) {
        makeAsset("chesspiece", {"x": (posX + border + i * caseSize), "y": (posY + border)}, {"w": caseSize, "h": caseSize}, "black", null, pieces[i]);
        makeAsset("chesspiece", {"x": (posX + border + i * caseSize), "y": (posY + border + caseSize)}, {"w": caseSize, "h": caseSize}, "black", null, "pawn");

        makeAsset("chesspiece", {"x": (posX + border + i * caseSize), "y": (posY + border + 7 * caseSize)}, {"w": caseSize, "h": caseSize}, "white", null, pieces[i]);
        makeAsset("chesspiece", {"x": (posX + border + i * caseSize), "y": (posY + border + 6 * caseSize)}, {"w": caseSize, "h": caseSize}, "white", null, "pawn");
    }
}

async function init() {
    /* Add availables to the list */
    const response = await fetch("/api/available_assets");
    const data = await response.json();

    for (let asset of data) {
        gameState.availableAssets.push(asset);
    }

    document.addEventListener("mousedown", (event) => {
        const assets = getAssetsUnderPoint(event.clientX, event.clientY);
    
        for (const asset of assets) {
            const img = asset.htmlElement;
            const rect = img.getBoundingClientRect();
    
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
    
            const scaleX = img.naturalWidth / img.clientWidth;
            const scaleY = img.naturalHeight / img.clientHeight;
    
            const realX = Math.floor(x * scaleX);
            const realY = Math.floor(y * scaleY);
    
            // Draw image on canvas to test pixel alpha
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
    
            const pixel = ctx.getImageData(realX, realY, 1, 1).data;
            const alpha = pixel[3];
    
            if (alpha > 0) {
                if (!asset.traits || !asset.traits.includes("cannot_move")) {
                    bringAssetToFront(asset);
        
                    gameState.currentDrag = {
                        asset: asset,
                        start: { x: event.clientX, y: event.clientY },
                        orig: {
                            x: parseInt(asset.htmlElement.style.left) || 0,
                            y: parseInt(asset.htmlElement.style.top) || 0
                        },
                        element: asset.htmlElement
                    };
                }
    
                break; // stop after first visible pixel match
            }
        }
    });

    document.addEventListener("mousemove", (event) => {
        console.log("hello");

        if (!gameState.currentDrag) return;
    
        let dx = event.clientX - gameState.currentDrag.start.x;
        let dy = event.clientY - gameState.currentDrag.start.y;
        
        gameState.currentDrag.element.style.left = `${gameState.currentDrag.orig.x + dx}px`;
        gameState.currentDrag.element.style.top = `${gameState.currentDrag.orig.y + dy}px`;
    });
  
    document.addEventListener("mouseup", () => {
        if (!gameState.currentDrag) return;

        // Update asset location
        gameState.currentDrag.asset.location.x = parseInt(gameState.currentDrag.element.style.left);
        gameState.currentDrag.asset.location.y = parseInt(gameState.currentDrag.element.style.top);

        // Save to history
        console.log(gameState.currentDrag);
        saveMoveToHistory(gameState.currentDrag.asset.uuid, gameState.currentDrag.orig, gameState.currentDrag.asset.location);
        console.log(gameState.history);

        gameState.currentDrag = null;
    });

    document.getElementById("backward_history_button").addEventListener("click", () => {
        goBackwardHistory();
    });

    document.getElementById("forward_history_button").addEventListener("click", () => {
        goForwardHistory();
    });
}


function moveDynamicallyAsset(asset, startPosition, stopPosition, time) {
    asset.htmlElement.style.left = `${startPosition.x}px`;
    asset.htmlElement.style.top = `${startPosition.y}px`;

    bringAssetToFront(asset);

    let deltaX = stopPosition.x - startPosition.x;
    let deltaY = stopPosition.y - startPosition.y;

    const animName = `move${asset.uuid}_${Date.now()}`; // 👈 nom unique
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${animName} {
        0% { transform: translate(0, 0); }
        100% { transform: translate(${deltaX}px, ${deltaY}px); }
      }
    `;
    document.head.appendChild(style);

    asset.htmlElement.style.animation = `${animName} ${time}s ease-in-out forwards`;

    asset.htmlElement.addEventListener("animationend", () => {
        asset.htmlElement.style.animation = "";
        asset.htmlElement.style.transform = "";
        asset.htmlElement.onanimationend = null;

        asset.location.x = stopPosition.x;
        asset.location.y = stopPosition.y;

        asset.htmlElement.style.left = `${asset.location.x}px`;
        asset.htmlElement.style.top = `${asset.location.y}px`;
    });
}

function saveMoveToHistory(uuid, previous_location, next_location) {
    console.log(gameState.currentDrag);

    const prev = { x: previous_location.x, y: previous_location.y };
    const next = { x: next_location.x, y: next_location.y };

    if (prev.x != next.x || prev.y != next.y) {
        if (gameState.history.position < gameState.history.delta.length) {
            gameState.history.delta = gameState.history.delta.slice(0, gameState.history.position);
        }
        gameState.history.delta.push({"type": "move", "uuid": uuid, "previous_location": prev, "next_location": next});
        gameState.history.position++;
    }
}

function saveFlipToHistory(uuid) {
    if (gameState.history.position < gameState.history.delta.length) {
        gameState.history.delta = gameState.history.delta.slice(0, gameState.history.position);
    }
    gameState.history.delta.push({"type": "flip", "uuid": uuid});
    gameState.history.position++;
}


function goBackwardHistory() {
    if (gameState.history.position > 0) {
        gameState.history.position--;
        let action = gameState.history.delta[gameState.history.position];
        console.log(action);
        let asset = gameState.assets.find(item => item.uuid == action.uuid);
        console.log(asset);
        console.log(gameState.assets);

        switch (action.type) {
            case "move":
                moveDynamicallyAsset(asset, action.next_location, action.previous_location, 0.5);
                break;
            case "flip":
                flipAsset(asset);
                break;
        }
    }
    else {
        console.log("no history!");
    }

    console.log(gameState.history);
}

function goForwardHistory() {
    if (gameState.history.position < gameState.history.delta.length) {
        let action = gameState.history.delta[gameState.history.position];
        let asset = gameState.assets.find(item => item.uuid == action.uuid);

        switch (action.type) {
            case "move":
                moveDynamicallyAsset(asset, action.previous_location, action.next_location, 0.5);
                break;
            case "flip":
                flipAsset(asset);
                break;
        }

        gameState.history.position++;
    }
    else {
        console.log("cannot go further!");
    }

    console.log(gameState.history);
}

async function main() {
    await init()
    presentPoker();
}

main();
