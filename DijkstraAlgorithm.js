var nodes = [];
var numNodes = 10;
var minDistance = 50;

var docWidth, docHeight;
var boardui = getElemId("board");
var brush = boardui.getContext("2d");

function pageReady() {
	resizeBoard();
	generateBoard();
}

function resizeBoard() {
	docWidth = getElemWidth(contentWrapper);
	docHeight = getElemHeight(contentWrapper);

	setElemWidth(boardui, docWidth);
	setElemHeight(boardui, docHeight);
	boardui.setAttribute('width', docWidth);
	boardui.setAttribute('height', docHeight);
}

function onResize() {
	resizeBoard();
	generateBoard();
}

function generateBoard() {
	nodes = new Array(numNodes);
	nodes[0] = new Node(nodes, minDistance, 'red', 1);
	nodes[1] = new Node(nodes, minDistance, 'red', 2);
	for (var i = 2; i < nodes.length; i++)
		nodes[i] = new Node(nodes, minDistance);

	for (var i = 0; i < nodes.length; i++)
		nodes[i].findNeighbors(nodes);

	drawBoard();
}

function clearBoard() {
	brush.clearRect(0, 0, docWidth, docHeight);
	brush.fillStyle = 'white';
	brush.fillRect(0, 0, docWidth, docHeight);
}

function drawPath(node1, node2, color) {
	brush.beginPath();
	brush.moveTo(node1.x, node1.y);
	brush.lineTo(node2.x, node2.y);
	brush.strokeStyle = color;
	brush.stroke();
	brush.closePath();
}

function drawWeb() {
	for (var i = 0; i < nodes.length; i++)
		for (var a = 0; a < nodes[i].neighbors.length; a++)
			drawPath(nodes[i], nodes[i].neighbors[a], 'black');
}

function drawNode(node) {
	brush.beginPath();
	brush.arc(node.x, node.y, node.radius, 0, 2 * Math.PI, false);
	brush.fillStyle = node.color;
	brush.fill();
	brush.closePath();
}

function drawBoard() {
	clearBoard();
	drawWeb();
	for (var i = 0; i < nodes.length; i++)
		drawNode(nodes[i]);
}

function nodeDistance(node1, node2) {
	return Math.sqrt(Math.pow(node1.x - node2.x, 2) +
		Math.pow(node1.y - node2.y, 2));
}

function rectangleArea(rect) {
	return Math.abs(
		rect[0][0] * rect[1][1] - rect[0][1] * rect[1][0] +
		rect[1][0] * rect[2][1] - rect[1][1] * rect[2][0] +
		rect[2][0] * rect[3][1] - rect[2][1] * rect[3][0] +
		rect[3][0] * rect[0][1] - rect[3][1] * rect[0][0]
	) / 2;
}

function triangleArea(x1, y1, x2, y2, x3, y3) {
	return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))) / 2;
}

function getRectangle(node1, node2) {
	var slope = (node1.y - node2.y) / (node1.x - node2.x);
	var pslope = -1 / slope; // perp slope
	var slopeTerm = Math.sqrt(1 + Math.pow(slope, 2));
	var pslopeTerm = Math.sqrt(1 + Math.pow(pslope, 2));

	var xoffset1 = minDistance / slopeTerm;
	var xoffset2 = minDistance / slopeTerm;

	var x1 = node1.x + xoffset1 * (node1.x < node2.x ? 1:-1);
	var x2 = node2.x - xoffset2 * (node1.x < node2.x ? 1:-1);
	var y1 = node1.y + xoffset1 * slope * (node1.x < node2.x ? 1:-1);
	var y2 = node2.y - xoffset2 * slope * (node1.x < node2.x ? 1:-1);

	xoffset1 = node1.radius / pslopeTerm * 4;
	xoffset2 = node2.radius / pslopeTerm * 4;

	return [
		[x1 + xoffset1, y1 + xoffset1 * pslope],
		[x1 - xoffset1, y1 - xoffset1 * pslope],
		[x2 - xoffset2, y2 - xoffset2 * pslope],
		[x2 + xoffset2, y2 + xoffset2 * pslope]
	];
}

function drawRect(rect) {
	brush.beginPath();
	brush.moveTo(rect[0][0], rect[0][1]);
	brush.lineTo(rect[1][0], rect[1][1]);
	brush.lineTo(rect[2][0], rect[2][1]);
	brush.lineTo(rect[3][0], rect[3][1]);
	brush.lineTo(rect[0][0], rect[0][1]);
	brush.strokeStyle = 'green';
	brush.stroke();
	brush.closePath();
}

function withinRectangle(rect, node) {
	var sum = 0, area;

	area = triangleArea(node.x, node.y,
		rect[0][0], rect[0][1], rect[1][0], rect[1][1]);
	if (area === 0)
		return false;
	sum += area;

	area = triangleArea(node.x, node.y,
		rect[1][0], rect[1][1], rect[2][0], rect[2][1]);
	if (area === 0)
		return false;
	sum += area;

	area = triangleArea(node.x, node.y,
		rect[2][0], rect[2][1], rect[3][0], rect[3][1]);
	if (area === 0)
		return false;
	sum += area;

	area = triangleArea(node.x, node.y,
		rect[3][0], rect[3][1], rect[0][0], rect[0][1]);
	if (area === 0)
		return false;
	sum += area;

	return sum <= rectangleArea(rect) + 100;
}


function pathClear(node1, node2) {
	var rect = getRectangle(node1, node2);
	for (var i = 0; i < nodes.length && nodes[i] !== undefined; i++)
		if (nodes[i] !== node1 && nodes[i] !== node2)
			if (withinRectangle(rect, nodes[i]))
				return false;
	return true;
}

class Node {
	constructor(nodes, minDistance, color='black', value=0) {
		this.x = 0;
		this.y = 0;
		this.color = color;
		this.radius = 15;
		this.value = value;
		this.neighbors = [];
		this.distances = []; // distances from corresponding neighbors

		var works = false;
		while (!works) {
			works = true;
			this.x = parseInt(Math.random() * (docWidth - this.radius * 2))
				+ this.radius;
			this.y = parseInt(Math.random() * (docHeight - this.radius * 2))
				+ this.radius;
			for (var i = 0; i < nodes.length && nodes[i] !== undefined; i++)
				if (nodeDistance(this, nodes[i]) < minDistance) {
					works = false;
					break;
				}
		}
	}

	findNeighbors(nodes) {
		for (var i = 0; i < nodes.length && nodes[i] !== undefined; i++)
			if (nodes[i] !== this && this.neighbors.indexOf(nodes[i]) === -1
				&& pathClear(this, nodes[i])) {
				this.neighbors.push(nodes[i]);
				this.distances.push(nodeDistance(this, nodes[i]));
				nodes[i].neighbors.push(this);
				nodes[i].distances.push(nodeDistance(this, nodes[i]));
			}
	}
}
