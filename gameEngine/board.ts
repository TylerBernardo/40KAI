import {UnitWrapper} from "./units.ts"
import {Tile, BoardObject, Terrain} from "./boardObject.ts"
//represents the game board. Keeps track of unit positions, tiles on the board, and other things.
class Board{
    height:number = 0;
    width:number = 0;
    tiles:Tile[][] = [];
    constructor(height:number,width:number){
        this.height = height;
        this.width = width;
        this.tiles = Array(height);
        //create array of tiles
        for(let r = 0; r < height; r++){
            this.tiles[r] = Array(width);
            for(let c = 0; c < width; c++){
                this.tiles[r][c] = new Tile(c,r);
            }
        }
    }

    printBoard():string{
        let output:string = "";
        for(let r = 0; r < this.height; r++){
            for(let c = 0; c < this.width; c++){
                output += "[ " + this.tiles[r][c].toString() + "] "
            }
            output += '\n';
        }
        return output;
    }

    printBoardFormatted():string{
        let output:string = "<table>";
        for(let r = 0; r < this.height; r++){
            output += "<tr>"
            for(let c = 0; c < this.width; c++){
                output += "<td>a" + this.tiles[r][c].toString() + "</td>"
            }
            output += '</tr>';
        }
        return output + "</table>";
    }

    getTile(x:number,y:number):Tile{
        return this.tiles[y][x]
    }

    //https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
    lineOfSight(startTile:Tile,targetTile:Tile):boolean{
        //if the points are oriented wrong, swap them.
        if(targetTile.x < startTile.x){
            //console.log(targetTile.x,targetTile.y)
            return this.lineOfSight(targetTile,startTile)
        }
        const dx:number = targetTile.x - startTile.x;
        const dy:number = targetTile.y - startTile.y;
        let D:number = 2 * dy - dx;
        let y:number = startTile.y;
        for(let x = startTile.x; x <= targetTile.x; x += 1){
            if(this.tiles[y][x].blocksLOS){
                return false;
            }
            if(D > 0){
                y = y + 1;
                D = D - 2 * dx;
            }
            D = D + 2 * dy;
        };
        return true;
    }

    distance(tile1:Tile,tile2:Tile):number{
        return Math.sqrt( (tile1.x-tile2.x)**2 + (tile1.y-tile2.y)**2 )
    }

    getValidMoves(tile:Tile,movement:number):[number,number][]{
        var validMoves:[number,number][] = []
        for(let x = Math.max(0,tile.x - movement); x <Math.min(tile.x + movement,this.width-1); x++){
            for(let y = Math.max(0,tile.y - movement); y < Math.min(tile.y + movement,this.height-1); y++){
                //its only a valid move if it is within movement range and the tile is not occupied by a different unit
                if(Math.sqrt((x-tile.x)**2 + (y-tile.y)**2) <= movement && (!this.getTile(x,y).hasUnit || (x == tile.x && y == tile.y))){
                    validMoves.push([x,y])
                }
            }
        }
        return validMoves;
    }
};

//represents a object on the board


export {
    Board,
    Terrain,
    Tile,
    BoardObject
}