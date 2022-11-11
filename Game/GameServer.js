const http = require("http");
const crypto = require("crypto");
const fs = require("fs")
const uuid = require("uuid");

let server = http.createServer()
server.listen(80);

server.on("request",(req,res)=>{
     fs.readFile("./Game.html",(err,data)=>{
          res.end(data)
     })
})

const clients = [];

server.on("upgrade",function(req,socket,head){
     let id = uuid.v4()
     let key = req.headers['sec-websocket-key'];
     let ack = crypt(key);
     const header = ['http/1.1 101 WebSocket','connection:upgrade','upgrade:websocket',`sec-websocket-accept:${ack}`]
     socket.write(header.join('\r\n')+'\r\n\r\n');
     let cObj = {id,socket}
     clients.push(cObj)
     socket.on("data",(d)=>{
          let datas = parseData(d);
          console.log(datas);
          let replyForm = {
               data:datas
          }
          if(!datas)return
           console.log(clients.length);
          for(let i of clients){
               if(i.id != id)i.socket.write(constructFrame(replyForm))
          }//constructFrame(replyForm)
     })
})

function crypt(key){
     return crypto.createHash('sha1').update(key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest('base64')
}
let opcode;
function parseData(data){
     let fin = data[0]>>>7;
     opcode = data[0]&15;
     if(opcode == 8)return
     let isMasked = data[1]>>>7;
     let payloadLength = data[1]&127;
      let offset = 2;
     if(payloadLength>125){
          if(payloadLength == 126){
               payloadLength = data.readUint16BE(offset);
               offset+=2;
          }
          // if(payloadLength == 127){
          //      payloadLength = data.readBigUInt64BE(offset);
          //      let inNum = Number(payloadLength);
          //      console.log(inNum)
          //      offset+=8;
          //      return "error";
          // }
     }
     let unMaskedBuffer = Buffer.alloc(payloadLength)
     if(isMasked){
          let mask = data.slice(offset,offset+4);
          offset+=4;
          for(let i =0;i<payloadLength;i++){

               let current_data = data.readUint8(offset);
               offset++;
               unMaskedBuffer[i] = current_data^mask[i%4]
          }
     }
     else{
          for(let i=0;i<payloadLength;i++){
               unMaskedBuffer = data.readUint8(offset);
               offset++;
          }
     }
     return unMaskedBuffer.toString("utf-8")
}

function constructFrame(data){
     let dataJson = JSON.stringify(data);
     let dataBuffer = Buffer.from(dataJson);

     let basicFrame = Buffer.alloc(2);
     basicFrame.writeUInt8(129,0);
     let payloadLength = dataJson.length;
     if(!(payloadLength<126))payloadLength = 126;
     basicFrame.writeUInt8(payloadLength,1);
     if(payloadLength==126){
          let basicFrame2 = Buffer.alloc(2);
          basicFrame2.writeUInt16BE(dataJson.length,0);
          basicFrame = Buffer.concat([basicFrame,basicFrame2]);
     }
     let replyBuffer = Buffer.concat([basicFrame,dataBuffer]);

     console.log(replyBuffer)
     return replyBuffer
}