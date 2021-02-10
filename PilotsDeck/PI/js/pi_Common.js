﻿// global websocket, used to communicate from/to Stream Deck software
// as well as some info about our plugin, as sent by Stream Deck software 
var websocket = null,
  uuid = null,
  inInfo = null,
  actionInfo = {},
  ImageFiles = "",
  ActionTypes = "",
  FontNames = "",
  FontStyles = "",
  displayInfo = {};

function fillImageSelectBox(values, elementID, configured) {
	values = values.split('|');
	for (i = 0; i < values.length; i++) {
		var option = document.createElement("option");
		option.text = values[i].split('/')[1].split('.')[0];
		option.value = values[i];
		if (values[i] == configured)
			option.selected = true;
		document.getElementById(elementID).add(option);
	}
}

function fillFontSelectBox(values, elementID, configured) {
	values = values.split('|');
	for (i = 0; i < values.length; i++) {
		var option = document.createElement("option");
		option.text = values[i];
		option.value = values[i];
		if (values[i] == configured)
			option.selected = true;
		document.getElementById(elementID).add(option);
	}
}

function fillTypeSelectBox(values, elementID, configured) {
	if (values || values != "") {
		values = values.split('|');
		for (i = 0; i < values.length; i++) {
			var option = document.createElement("option");
			var type = values[i].split('=');
			option.text = type[1];
			option.value = type[0];
			if (type[0] == configured)
				option.selected = true;
			document.getElementById(elementID).add(option);
		}
	}
}

function refreshSettings(settings) {
	if (settings) {
        for (var key in settings) {
			if (settingsModel.hasOwnProperty(key)) {
				settingsModel[key] = settings[key];
				var elem = document.getElementById(key);
				if (elem && elem.type == "checkbox") {
					elem.checked = settingsModel[key];
				}
				else if (elem) {
					elem.value = settingsModel[key];
				}
			}
        }
    }
}

function toggleConfigItem(value, block, label, input) {
	if (value) {
		document.getElementById(block).style.display = displayInfo[block];
		document.getElementById(label).style.display = displayInfo[label];
		document.getElementById(input).style.display = displayInfo[input];
	}
	else if (document.getElementById(block).style.display != "none") {
		displayInfo[block] = document.getElementById(block).style.display;
		displayInfo[label] = document.getElementById(label).style.display;
		displayInfo[input] = document.getElementById(input).style.display;

		document.getElementById(block).style.display = "none";
		document.getElementById(label).style.display = "none";
		document.getElementById(input).style.display = "none";
	}
}

function setPattern(field, type) {
	var regName = "[a-zA-Z0-9\x2D\x5F]+";
	var regLvar = `^([^0-9]{1}(L:){0,1}${regName}){1}(:(L:){0,1}${regName})*$`;
	var regOffset = "((0x){0,1}[0-9A-F]{4}:[0-9]{1,3}(:[ifs]{1}(:s)?)?){1}";
	
	if (type == 0) //macro
		document.getElementById(field).pattern = `^([^0-9]{1}${regName}(:${regName}){1,}){1}$`;
	else if (type == 1) //script
		document.getElementById(field).pattern = `^Lua:${regName}$`;
	else if (type == 2) //control
		document.getElementById(field).pattern = "^[0-9]+(:[0-9]+)*$";
	else if (type == 3)  //lvar
		document.getElementById(field).pattern = regLvar;
	else if (type == 4)  //offset
		document.getElementById(field).pattern = regOffset;
	else if (type == 5) //offset | lvar
		document.getElementById(field).pattern = `${regOffset}|${regLvar}`;
	else
		document.getElementById(field).pattern = "";
}

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
	uuid = inUUID;
	actionInfo = JSON.parse(inActionInfo);
	inInfo = JSON.parse(inInfo);
	websocket = new WebSocket('ws://localhost:' + inPort);

	refreshSettings(actionInfo.payload.settings.settingsModel);
	updateForm();
	
	fillSelectBoxes();
	
	websocket.onopen = function () {
		var json = { event: inRegisterEvent, uuid: inUUID };
		// register property inspector to Stream Deck
		websocket.send(JSON.stringify(json));
	};

	websocket.onmessage = function (evt) {
		// Received message from Stream Deck
		var jsonObj = JSON.parse(evt.data);
		var sdEvent = jsonObj['event'];
		switch (sdEvent) {
			case "sendToPropertyInspector":
				if (jsonObj.payload && jsonObj.payload.ActionTypes && jsonObj.payload.ActionTypes != "") {
					if (!ActionTypes || ActionTypes == "") {
						ActionTypes = jsonObj.payload.ActionTypes;
					}
					else {
						ActionTypes = jsonObj.payload.ActionTypes;
					}
				}
				if (jsonObj.payload && jsonObj.payload.ImageFiles && jsonObj.payload.ImageFiles != "") {
					if (!ImageFiles || ImageFiles == "") {
						ImageFiles = jsonObj.payload.ImageFiles;
					}
					else {
						ImageFiles = jsonObj.payload.ImageFiles;
					}
				}
				if (jsonObj.payload && jsonObj.payload.FontNames && jsonObj.payload.FontNames != "") {
					if (!FontNames || FontNames == "") {
						FontNames = jsonObj.payload.FontNames;
					}
					else {
						FontNames = jsonObj.payload.FontNames;
					}
				}
				if (jsonObj.payload && jsonObj.payload.FontStyles && jsonObj.payload.FontStyles != "") {
					if (!FontStyles || FontStyles == "") {
						FontStyles = jsonObj.payload.FontStyles;
					}
					else {
						FontStyles = jsonObj.payload.FontStyles;
					}
				}
				fillSelectBoxes();
				break;
			case "didReceiveSettings":
				refreshSettings(jsonObj.payload.settings.settingsModel);
				updateForm();
				break;
			default:
				break;
		}
	};
}

const setSettings = (value, param) => {
	if (websocket) {
		settingsModel[param] = value;
		var json = {
			"event": "setSettings",
			"context": uuid,
			"payload": {
				"settingsModel": settingsModel
			}
		};
	websocket.send(JSON.stringify(json));
	}
	updateForm();
};