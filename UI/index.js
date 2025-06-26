var socket;
var body;
var tableList = []
var panelList = []
var widthG,heightG;
var currentUnits = {}

var selected = false;
var selectedModel;
var selectedModelPlayer;

function onloadF(){
  body = document.getElementsByTagName("body")[0]
  socket = io();

  socket.on('buildTable', function(width, height){
    widthG = width;
    heightG = height;
    console.log(width,height)
    var table = document.createElement("table")
    for(var r = 0; r < height; r++){
      var tr = document.createElement("tr")
      for(var c = 0; c < width; c++){
        var link = document.createElement("a")
        link.href = "#"
        link.addEventListener("click",moveModel)
        var cell = document.createElement("td")
        cell.innerHTML = "<p></p>"//c + "," + r
        cell.id = c + "," + r
        //cell.addEventListener("click",moveModel)
        tableList.push(cell)
        link.appendChild(cell)
        //create info panel
        let panelDiv = document.createElement("div")
        panelDiv.className = "info"
        panelList.push(panelDiv)
        link.appendChild(panelDiv)
        tr.appendChild(link)
      }
      table.appendChild(tr)
    }
    body.appendChild(table)
  })

  socket.on('setModel', function(x,y,modelName,player){
    setModelPosition(x,y,modelName,player)
  })

  socket.on('updateUnit', (unitInfo) => {
    updateUnitInfo(unitInfo)
  })

  socket.emit("ready")
}

function updateUnitInfo(info){
  //add an index property for display functions
  info.index = info.y * widthG + info.x
  currentUnits[info.name] = info
}

function generateLabel(unitName){
  let unit = currentUnits[unitName]
  if(unit == undefined){
    throw new error("Unit does not exist!")
  }
  let output = "<h4>" + unitName + "</h4>"
  //iterate over each model in the unit
  for(let model of unit.units){
    output += "<ul>" + model.name + ": " + model.wounds + " Wounds Remaining</ul>"
  }
  return output
}

function setModelPosition(x,y,modelName,player){
  console.log(modelName,x,y)
    var celltoChange = tableList[y * widthG + x]
    celltoChange.innerHTML = '<p class = "player' +  player + '">'+ modelName + "</p>"
    panelList[y * widthG + x].innerHTML = generateLabel(modelName)
  //celltoChange.innerHTML = '<a href = "#" class = "player' +  player + '" onclick="moveModel(event)">'+ modelName + "</a>"
    if(currentUnits[modelName] == undefined){
      throw new error("Unit does not exist on the board")
      //currentUnits[modelName] = y * widthG + x
    }else{
      if(x == currentUnits[modelName].x && y == currentUnits[modelName].y){
        
      }else{
        tableList[currentUnits[modelName].index].innerHTML = "<p></p>"//_x + "," + _y
        panelList[currentUnits[modelName].index].innerHTML = ""
        currentUnits[modelName].index = y * widthG + x
        currentUnits[modelName].x = x
        currentUnits[modelName].y = y
      }
    }
  }

function moveModel(e){
  e.preventDefault()
  var target = e.target
  console.log(target)
  var player = parseInt(target.className.split("player")[1])
  console.log(player)
  if(!isNaN(player) && !selected){
    selected = true;
    selectedModel = target.innerHTML
    selectedModelPlayer = target.classList[0].split("player")[1]
    return
  }
  if(selected && isNaN(player)){
    selected = false;
    var posString = target.id;
    var pos = posString.split(",")
    console.log(pos)
    setModelPosition(parseInt(pos[0]),parseInt(pos[1]),selectedModel,selectedModelPlayer)
  }else if(selected){
    selected = false;
  }
}






