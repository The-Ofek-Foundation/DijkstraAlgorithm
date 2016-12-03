var nodes = [], unvisitedNodes = [];
var numNodes = 100;
var radii = 10;
var minDistance = radii * 10;

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

	numNodes = parseInt(docWidth * docHeight / Math.pow(minDistance * 1.5, 2));
}

function onResize() {
	resizeBoard();
	generateBoard();
}

function generateBoard() {
	nodes = new Array(numNodes);
	nodes[0] = new Node(nodes, 0, minDistance, 'blue', 1);
	nodes[0].distance = 0;
	nodes[1] = new Node(nodes, 1, minDistance, 'black', 2);
	for (var i = 2; i < nodes.length; i++)
		nodes[i] = new Node(nodes, i, minDistance);

	for (var i = 0; i < nodes.length; i++)
		nodes[i].findNeighbors(nodes);

	for (var i = 0; i < nodes.length; i++)
		nodes[i].cleanupNeighbors(nodes);

	unvisitedNodes = new Array(nodes.length);
	for (var i = 0; i < nodes.length; i++)
		unvisitedNodes[i] = nodes[i];

	calculateDistances(nodes[0]);

	drawBoard();
}

function clearBoard() {
	brush.clearRect(0, 0, docWidth, docHeight);
	brush.fillStyle = 'white';
	brush.fillRect(0, 0, docWidth, docHeight);
}

function drawPath(node1, node2, color, thickness = 1) {

	var width = node2.x - node1.x;
	var height = node2.y - node1.y;
	var length = nodeDistance(node1, node2);

	var xS = (thickness * height / length) / 2
	var yS = (thickness * width / length) / 2;

	brush.beginPath();
	brush.moveTo(node1.x - xS, node1.y + yS);
	brush.lineTo(node1.x + xS, node1.y - yS);
	brush.lineTo(node2.x + xS, node2.y - yS);
	brush.lineTo(node2.x - xS, node2.y + yS);
	brush.lineTo(node1.x - xS, node1.y + yS);
	brush.fillStyle = color;
	brush.fill();
	brush.closePath();
}

function drawHeatmap() {
	var frequencies = new Array(nodes.length);
	for (var i = 0; i < frequencies.length; i++) {
		frequencies[i] = new Array(nodes.length);
		for (var a = 0; a < frequencies[i].length; a++)
			frequencies[i][a] = 0;
	}

	for (var i = 0; i < nodes.length; i++)
		for (var node = nodes[i]; node.bestNode !== node; node = node.bestNode) {
			frequencies[node.i][node.bestNode.i]++;
			node.bestNode.radius += 1/3;
		}


	for (var i = 0; i < frequencies.length; i++)
		for (var a = i + 1; a < frequencies[i].length; a++) {
			if (frequencies[i][a] + frequencies[a][i] > 0)
				drawPath(nodes[i], nodes[a], 'red', 2);
			drawPath(nodes[i], nodes[a], 'rgba(255, 0, 0, 0.8)',
				frequencies[i][a] + frequencies[a][i]);
		}
}

function drawBestPath(node) {
	if (node === nodes[0] || node.bestNode === node)
		return;

	drawPath(node, node.bestNode, 'green', 5);
	drawBestPath(node.bestNode);
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
	drawHeatmap();
	// drawBestPath(nodes[1]);
	for (var i = nodes.length - 1; i >= 0; i--)
		drawNode(nodes[i]);
}

function nodeDistance(node1, node2) {
	return Math.sqrt(Math.pow(node1.x - node2.x, 2) +
		Math.pow(node1.y - node2.y, 2));
}

function getSlope(x1, y1, x2, y2) {
	return (y1 - y2) / (x1 - x2);
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

	var xoffset1 = minDistance / 2 / slopeTerm;
	var xoffset2 = minDistance / 2 / slopeTerm;

	var x1 = node1.x + xoffset1 * (node1.x < node2.x ? 1:-1);
	var x2 = node2.x - xoffset2 * (node1.x < node2.x ? 1:-1);
	var y1 = node1.y + xoffset1 * slope * (node1.x < node2.x ? 1:-1);
	var y2 = node2.y - xoffset2 * slope * (node1.x < node2.x ? 1:-1);

	xoffset1 = node1.radius / pslopeTerm * 2;
	xoffset2 = node2.radius / pslopeTerm * 2;

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

function withinCones(node, cones) {
	for (var i = 0; i < cones.length; i++)
		if (withinRectangle(cones[i], node))
			return true;
	return false;
}

function createCone(node1, node2) {
	var slope = (node1.y - node2.y) / (node1.x - node2.x);
	var pslope = -1 / slope; // perpendicular slope
	var slopeTerm = Math.sqrt(1 + Math.pow(slope, 2));
	var pslopeTerm = Math.sqrt(1 + Math.pow(pslope, 2));
	var distance = nodeDistance(node1, node2);

	var xoffset1 = node1.radius / pslopeTerm;
	var xoffset2 = (node1.radius + distance / 4) / pslopeTerm;

	var x1 = node1.x + xoffset1, y1 = node1.y + xoffset1 * pslope;
	var x2 = node1.x - xoffset1, y2 = node1.y - xoffset1 * pslope;

	var x3 = x1 + (node2.x + xoffset2 - x1) * docWidth * docHeight;
	var x4 = x2 + (node2.x - xoffset2 - x2) * docWidth * docHeight;

	var y3 = y1 + (node2.y + xoffset2 * pslope - y1) * docWidth * docHeight;
	var y4 = y2 + (node2.y - xoffset2 * pslope - y2) * docWidth * docHeight;

	return [[x1, y1], [x2,y2], [x4, y4], [x3, y3]];
}

function pathClear(node1, node2) {
	var rect = getRectangle(node1, node2);
	for (var i = 0; i < nodes.length && nodes[i] !== undefined; i++)
		if (nodes[i] !== node1 && nodes[i] !== node2)
			if (withinRectangle(rect, nodes[i]))
				return false;
	return true;
}

function calculateDistances(node) {
	var neighbors = node.neighbors, distances = node.distances;
	for (var i = 0; i < neighbors.length; i++)
		if (!neighbors[i].visited &&
			node.distance + distances[i] < neighbors[i].distance) {
			neighbors[i].distance = node.distance + distances[i];
			neighbors[i].bestNode = node;
		}
	node.visited = true;
	unvisitedNodes.splice(unvisitedNodes.indexOf(node), 1);

	if (unvisitedNodes.length > 0) {
		var bestNode = unvisitedNodes[0];
		for (var i = 1; i < unvisitedNodes.length; i++)
			if (unvisitedNodes[i].distance < bestNode.distance)
				bestNode = unvisitedNodes[i];
		calculateDistances(bestNode);
	}
}

function attachNodes(node1, node2) {
	var distance = nodeDistance(node1, node2);
	node1.neighbors.push(node2);
	node1.distances.push(distance);
	node2.neighbors.push(node1);
	node2.distances.push(distance);
}

function detachNodes(node1, node2) {
	var index1 = node1.neighbors.indexOf(node2);
	var index2 = node2.neighbors.indexOf(node1);

	node1.neighbors.splice(index1, 1);
	node1.distances.splice(index1, 1);
	node2.neighbors.splice(index2, 1);
	node2.distances.splice(index2, 1);
}

class Node {
	constructor(nodes, index, minDistance, color='black', value=0) {
		this.x = 0;
		this.y = 0;
		this.color = color;
		this.radius = radii;
		this.value = value;
		this.neighbors = [];
		this.safeNeighbors = [];
		this.distances = []; // distances from corresponding neighbors
		this.distance = Number.MAX_SAFE_INTEGER;
		this.visited = false;
		this.bestNode = this;
		this.compared = false;
		this.i = index;

		var works = false;
		while (!works) {
			works = true;
			this.x = parseInt(Math.random() * (docWidth - minDistance / 2))
				+ minDistance / 4;
			this.y = parseInt(Math.random() * (docHeight - minDistance / 2))
				+ minDistance / 4;
			for (var i = 0; i < nodes.length && nodes[i] !== undefined; i++)
				if (nodeDistance(this, nodes[i]) < minDistance) {
					works = false;
					break;
				}
		}
	}

	findNeighbors(nodes) {
		var neighbors = [];
		var distances = [];
		for (var i = 0; i < nodes.length && nodes[i] !== undefined; i++)
			if (nodes[i] !== this) {
				neighbors.push(nodes[i]);
				distances.push(nodeDistance(this, nodes[i]));
			}

		for (var i = 0; i < neighbors.length; i++)
			neighbors[i].compared = false;

		var cones = [];
		for (var i = 0; i < neighbors.length; i++) {
			var minDistance = docWidth * docHeight, bestNode;
			for (var a = 0; a < neighbors.length; a++)
				if (!neighbors[a].compared && distances[a] < minDistance) {
					minDistance = distances[a];
					bestNode = neighbors[a];
				}
			if (!withinCones(bestNode, cones) &&
				this.neighbors.indexOf(bestNode) === -1)
				attachNodes(this, bestNode);
			cones.push(createCone(this, bestNode));
			bestNode.compared = true;
		}
	}

	cleanupNeighbors(nodes) {
		for (var i = this.neighbors.length - 1; i >= 0; i--) {
			outer:
			for (var a = nodes.length - 1; a >= 0; a--)
				if (nodes[a] !== this && nodes[a] !== this.neighbors[i])
					for (var b = nodes[a].neighbors.length - 1; b >= 0; b--)
						if (nodes[a].neighbors[b] !== this && nodes[a].neighbors[b] !== this.neighbors[i])
							if (lineIntersect(
								this.x, this.y,
								this.neighbors[i].x, this.neighbors[i].y,
								nodes[a].x, nodes[a].y,
								nodes[a].neighbors[b].x, nodes[a].neighbors[b].y))
								if (nodeDistance(this, this.neighbors[i]) <
									nodeDistance(nodes[a], nodes[a].neighbors[b])) {
									detachNodes(nodes[a], nodes[a].neighbors[b]);
								} else {
									detachNodes(this, this.neighbors[i]);
									break outer;
								}
		}
	}
}

// not my code
function lineIntersect(x1,y1,x2,y2, x3,y3,x4,y4) {
    var x=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    var y=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    if (isNaN(x)||isNaN(y)) {
        return false;
    } else {
        if (x1>=x2) {
            if (!(x2<=x&&x<=x1)) {return false;}
        } else {
            if (!(x1<=x&&x<=x2)) {return false;}
        }
        if (y1>=y2) {
            if (!(y2<=y&&y<=y1)) {return false;}
        } else {
            if (!(y1<=y&&y<=y2)) {return false;}
        }
        if (x3>=x4) {
            if (!(x4<=x&&x<=x3)) {return false;}
        } else {
            if (!(x3<=x&&x<=x4)) {return false;}
        }
        if (y3>=y4) {
            if (!(y4<=y&&y<=y3)) {return false;}
        } else {
            if (!(y3<=y&&y<=y4)) {return false;}
        }
    }
    return true;
}
