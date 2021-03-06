import {cards} from './cards.js'
import {utility} from './util.js'

const socket = io();
const finishedArtArray = ["Villager", "Werewolf", "Seer", "Shadow", "Hunter", "Mason", "Minion", "Sorcerer", "Dream Wolf"];

// important declarations
class Card {
    constructor(role, team, description, isTypeOfWerewolf) {
        this.id = null;
        this.role = role;
        this.isTypeOfWerewolf = isTypeOfWerewolf;
        this.team = team;
        this.description = description;
        this.quantity = 0;
    }
}

class Game {
    constructor(accessCode, size, deck, time, hasDreamWolf) {
        this.accessCode = accessCode;
        this.size = size;
        this.deck = deck;
        this.time = time;
        this.players = [];
        this.status = "lobby";
        this.hasDreamWolf = hasDreamWolf;
        this.endTime = null;
    }
}

const fullDeck = [];
let gameSize = 0;
let atLeastOnePlayer = false;


// register event listeners on buttons
document.getElementById("reset-btn").addEventListener("click", resetCardQuantities);
document.getElementById("create-btn").addEventListener("click", createGame);
document.getElementById("role-btn").addEventListener("click", function() { displayModal("role-modal") });
document.getElementById("edit-role-btn").addEventListener("click", function() { displayModal("edit-custom-roles-modal") });
document.getElementById("custom-role-form").addEventListener("submit", function(e) {
    addCustomCardToRoles(e);
});
Array.from(document.getElementsByClassName("close")).forEach(function(element) {
    element.addEventListener('click', closeModal);
});

// render all of the available cards to the user
window.onload = function() {
    readInUserCustomRoles();
    renderAvailableCards();
};

function renderAvailableCards() {
    cards.sort(function(a, b) {
        return a.role.toUpperCase().localeCompare(b.role);
    });
    document.getElementById("card-select").innerHTML = "";
    document.getElementById("roles").innerHTML = "";
    for (let i = 0; i < cards.length; i ++) {
        const newCard = new Card(cards[i].role, cards[i].team, cards[i].description, cards[i].isTypeOfWerewolf);
        // put card info in the informational role description modal
        const modalRole = document.createElement("div");
        modalRole.setAttribute("class", "modal-role");
        const roleClass = cards[i].team === "good" ? "role-village" : "role-wolf";
        let roleImage;
        if (cards[i].custom === true) {
            roleImage = "<img alt='No art' class='card-image-custom' src='/assets/images/custom.svg' />";
        } else {
            roleImage = finishedArtArray.includes(cards[i].role) ?
                "<img alt='No art' src='/assets/images/roles-small/" + cards[i].role.replace(/\s/g, '') + ".png' />"
                : "<span>Art soon.</span>";
        }
        modalRole.innerHTML =
            "<div>" +
            roleImage +
            "<div>" +
            "<h2 class='" + roleClass + "'>" + cards[i].role + "</h2>" +
            "<p>" + cards[i].team + "</p>" +
            "</div>" +
            "</div>" +
            "<p>" + cards[i].description + "</p>";

        document.getElementById("roles").appendChild(modalRole);

        fullDeck.push(newCard);

        const cardContainer = document.createElement("div");

        const quantityClass = cards[i].team === "good" ? "card-quantity quantity-village" : "card-quantity quantity-wolf";

        cardContainer.setAttribute("class", "card");
        cardContainer.setAttribute("id", "card-" + i);
        cardContainer.innerHTML =
            "<div class='card-top'>" +
            "<div class='card-header'>" +
            "<div>" +
            "<p class='card-role'>" + newCard.role + "</p>" +
            "<div class='" + quantityClass + "'>" + newCard.quantity + "</div>" +
            "</div>" +
            "<p>+</p>" +
            "</div>" +
            "</div>";
        cardContainer.innerHTML = cards[i].custom
            ? cardContainer.innerHTML += "<img class='card-image card-image-custom' src='../assets/images/custom.svg' alt='" + newCard.role + "'/>"
            : cardContainer.innerHTML +="<img class='card-image' src='../assets/images/roles-small/" + newCard.role.replace(/\s/g, '') + ".png' alt='" + newCard.role + "'/>";
        cardContainer.innerHTML +=
            "<div class='card-bottom'>" +
            "<p>-</p>" +
            "</div>";
        document.getElementById("card-select").appendChild(cardContainer);
        let cardTop = document.getElementById("card-" + i).getElementsByClassName("card-top")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardBottom = document.getElementById("card-" + i).getElementsByClassName("card-bottom")[0];
        cardTop.addEventListener("click", incrementCardQuantity, false);
        cardBottom.addEventListener("click", decrementCardQuantity, false);
        cardTop.card = newCard;
        cardTop.quantityEl = cardQuantity;
        cardBottom.card = newCard;
        cardBottom.quantityEl = cardQuantity;

    }
    renderCustomCard();
    resetCardQuantities();
}

function renderCustomCard() {
    let customCard = document.createElement("div");
    customCard.classList.add("card", "custom-card");
    customCard.setAttribute("id", "custom");

    let cardHeader = document.createElement("h1");
    cardHeader.innerText = "Add Custom Role";

    let cardBody = document.createElement("div");
    cardBody.innerText = "+";

    customCard.appendChild(cardHeader);
    customCard.appendChild(cardBody);
    document.getElementById("card-select").appendChild(customCard);

    customCard.addEventListener("click", function() {
        displayModal("custom-card-modal");
    });
}

function addCustomCardToRoles(e) {
    e.preventDefault();
    let newCard = {
        role: document.getElementById("custom-role-name").value,
        team: document.getElementById("custom-role-team").value,
        description: document.getElementById("custom-role-desc").value,
        isTypeOfWerewolf: document.getElementById("custom-role-wolf").checked,
        custom: true,
        saved: document.getElementById("custom-role-remember").checked
    };
    cards.push(newCard);
    renderAvailableCards();

    if (newCard.saved === true) {
        let existingRoles = localStorage.getItem("play-werewolf-custom-roles");
        if (existingRoles !== null) {
            let rolesArray;
            try {
                rolesArray = JSON.parse(existingRoles);
            } catch(e) {
                console.error(e.message);
            }
            if (rolesArray) {
                rolesArray.push(newCard);
            }
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(rolesArray));
        } else {
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(new Array(newCard)));
        }
    }
    updateCustomRoleModal();
    closeModal();
    document.getElementById("custom-role-form").reset();
}

function updateCustomRoleModal() {
    document.getElementById("custom-roles").innerHTML = "";
    cards.forEach((card) => {
        if (card.custom) {
            renderCustomRoleInModal(card);
        }
    });
}

function readInUserCustomRoles() {
    let existingRoles = localStorage.getItem("play-werewolf-custom-roles");
    if (existingRoles !== null) {
        let rolesArray;
        try {
            rolesArray = JSON.parse(existingRoles);
        } catch(e) {
            console.error(e.message);
        }
        if (rolesArray) {
            rolesArray.forEach((card) => {
                renderCustomRoleInModal(card);
                cards.push(card);
            })
        }
    }
    if (document.getElementById("custom-roles").getElementsByClassName("custom-role-edit").length === 0) {
        document.getElementById("custom-roles").innerHTML = "<h2>You haven't added any custom roles.</h2>";
    }
}

function renderCustomRoleInModal(card) {
    let roleElement = document.createElement("div");
    let editRemoveContainer = document.createElement("div");
    let roleName = document.createElement("p");
    let remove = document.createElement("img");

    // TODO: add edit functionality
    roleName.innerText = card.role;
    remove.setAttribute("src", "../assets/images/delete.svg");
    remove.setAttribute("title", "Delete");
    remove.addEventListener("click", function() { removeCustomRole(card.role) });
    roleElement.setAttribute("class", "custom-role-edit");

    editRemoveContainer.appendChild(remove);
    roleElement.appendChild(roleName);
    roleElement.appendChild(editRemoveContainer);
    document.getElementById("custom-roles").appendChild(roleElement);
}

function removeCustomRole(name) {
    let matchingCards = cards.filter((card) => card.role === name);
    matchingCards.forEach((card) => {
        cards.splice(cards.indexOf(card), 1);
    });
    let existingRoles = localStorage.getItem("play-werewolf-custom-roles");
    if (existingRoles !== null) {
        let rolesArray;
        try {
            rolesArray = JSON.parse(existingRoles);
        } catch (e) {
            console.error(e.message);
        }
        if (rolesArray) {
            rolesArray = rolesArray.filter((card) => card.role !== name);
        }
        localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(rolesArray));
    }
    updateCustomRoleModal();
    renderAvailableCards();
}


function incrementCardQuantity(e) {
    if(e.target.card.quantity < 25) {
        e.target.card.quantity += 1;
    }
    e.target.quantityEl.innerHTML = e.target.card.quantity;
    updateGameSize();
}

function decrementCardQuantity(e) {
    if(e.target.card.quantity > 0) {
        e.target.card.quantity -= 1;
    }
    e.target.quantityEl.innerHTML = e.target.card.quantity;
    updateGameSize();
}

function updateGameSize() {
    gameSize = 0;
    for (let card of fullDeck) {
        gameSize += card.quantity;
    }
    document.getElementById("game-size").innerText = gameSize + " Players";
    atLeastOnePlayer = gameSize > 0;
    return gameSize;
}

function resetCardQuantities() {
    for (let card of fullDeck) {
        card.quantity = 0;
    }
    updateGameSize();
    Array.prototype.filter.call(document.getElementsByClassName("card-quantity"), function(quantities){
        return quantities.innerHTML = 0;
    });
}

function displayModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
    document.getElementById("app-content").classList.add("hidden");
}

function closeModal() {
    document.getElementById("role-modal").classList.add("hidden");
    document.getElementById("custom-card-modal").classList.add("hidden");
    document.getElementById("edit-custom-roles-modal").classList.add("hidden");
    document.getElementById("app-content").classList.remove("hidden");
}

function buildDeckFromQuantities() {
    let playerDeck = [];
    for (const card of fullDeck) {
        for (let i = 0; i < card.quantity; i++) {
            let newCard = new Card(card.role, card.team, card.description, card.isTypeOfWerewolf);
            newCard.id = utility.generateID();
            playerDeck.push(newCard);
        }
    }
    return playerDeck;
}

function createGame() {
    if (document.getElementById("name").value.length > 0 && atLeastOnePlayer) {
        // generate 6 digit access code
        let code = "";
        let charPool = "abcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 6; i++) {
            code += charPool[utility.getRandomInt(36)]
        }

        // generate unique player Id for session
        let id = utility.generateID();
        sessionStorage.setItem("id", id);

        // player who creates the game is the host
        sessionStorage.setItem("host", true);

        // send a new game to the server, and then join it
        const playerInfo = {name: document.getElementById("name").value, code: code, id: id};
        let gameDeck = buildDeckFromQuantities();
        const game = new Game(
            code,
            gameSize,
            gameDeck,
            Math.ceil(document.getElementById("time").value),
            gameDeck.find((card) => card.role === "Dream Wolf") !== undefined
            );
        socket.emit('newGame', game, function() {
            socket.emit('joinGame', playerInfo);
            sessionStorage.setItem('code', code);
            window.location.replace('/' + code);
        });
    } else {
        document.getElementById("some-error").innerText = "There are problems with your above setup.";
        if (!atLeastOnePlayer) {
            document.getElementById("game-size").classList.add("error");
            document.getElementById("size-error").innerText = "Add at least one card";
        } else {
            document.getElementById("game-size").classList.remove("error");
            document.getElementById("size-error").innerText = "";
        }
        document.getElementById("name").classList.add("error");
        document.getElementById("name-error").innerText = "Name is required.";
    }
}
