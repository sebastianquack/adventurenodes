/* variable declarations */

var Util = require('./util.js')
var Menu = require('./menu_controller.js')
var Intro = require('./intro_controller.js')
var World = require('./world_controller.js')
var Chat = require('./chat_controller.js')

var mongoose = require('mongoose')
//var Bots = mongoose.model('Bot')

function restart(socket, player) {
  Util.write(socket, player, {name: "System"}, "Central computer", "sender", "chapter")
  player.inMenu = false
  player.state = "welcome"
  player.save()
  Intro.handleInput(socket, player, "")
}

// handle introduction
var handleInput = function(socket, player, input) {

  switch(Util.lowerTrim(input)) {

    case "restart":
      restart(socket, player)
      break

    case "back to the game":
      player.inMenu = false
      player.save()
      if(player.state == "world" || player.state == "bot" || player.state == "chat") {
        player.state = "world"
        player.save()
        World.handleInput(socket, player, "")
      } else {
        restart(socket, player)
      }
      break 

    case "help": 
      Util.write(socket, player, {name: "System"}, "How to play", "sender", "chapter")
      text = "Welcome to Adventure Nodes. Be curious! You'll figure things out. [back to the game]"
      player.inMenu = true
      player.save()
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")      
      break

    case "starte anleitung":
      Util.write(socket, player, {name: "System"}, "Exploration", "sender", "chapter")
      text = "Schau dich in Ruhe um und erforsche das Ruhrgebiet im Jahr 2044. Du kannst 53 verschiedene *Städte* besuchen, indem du auf die gelb unterlegten Kommandos klickst oder sie mit der Tastatur eingibst. Du kannst jederzeit [schaue] eingeben, um dich umzuschauen. Auf dem Weg wirst du verschiedene Verkehrsmittel nutzen und Abkürzungen entdecken. Am besten du machst dir eine Karte, um dich besser zurecht zu finden!<br>[erkläre immobilien] [zurück zum Spiel]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break
      
    case "schaue":
      if(player.inMenu) {      
        text = "Du schaust dir gerade die Spielanleitung an. Willst du vielleicht etwas über die Immobilien erfahren? [erkläre immobilien]"
        Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")      
      } else {
        return false
      }
      break
      
    case "erkläre immobilien":
      Util.write(socket, player, {name: "System"}, "Immobilien", "sender", "chapter")
      text = "Ziel des Spiels ist es, möglichst viele /einsame Immobilien/ miteinander in Kontakt zu bringen. Sprich mit ihnen, um herauszufinden, was ihnen fehlt. Baue eine 54. Stadt der Liebe oder spinne Intrigen. Achtung: Die Komplimente, Witze, Anmachsprüche und Beleidigungen, die die Immobilien austauschen, stammen alle von anderen Spielern.<br>[erkläre chat] [zurück zum Spiel]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break
      
    case "erkläre chat":
      Util.write(socket, player, {name: "System"}, "Chatten", "sender", "chapter")
      text = "Unterwegs triffst du manchmal auf andere Menschen, mit denen du frei chatten kannst. Sprich sie mit dem Kommando [sprich] an und beende das Gespräch, indem du dich Verabschiedest, z.B. mit 'tschüss'. Viel Spaß! [zurück zum Spiel]"
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      break
              
    case "spielstand": 
      Util.write(socket, player, {name: "System"}, "Spielstand", "sender", "chapter")

      player.inMenu = true
      player.save()
      
      // story
      var info = "Wusstest du schon? "
      
      relationshipVerbs = ["ist sauer auf", "ist interessiert an", "ist verknallt in", "liebt"]
      
      Bots.find({} , function(err, bots) {
        bots.forEach(function(bot, index) {
          rel_info = ""
          display_rels = []
          Object.keys(bot.relationships).forEach(function(key) {
            relationship = bot.relationships[key]
            if(relationship.level < 0) relationship.level = 0
            if(relationship.level > 3) relationship.level = 3
            if(relationship.level != 1) {
              display_rels.push(relationship)
            }
          })
          display_rels.forEach(function(relationship, index2) { 
            rel_info += " " + relationshipVerbs[relationship.level] + " "
            rel_info += "/" + Util.capitaliseFirstLetter(relationship.bot) + "/" + " aus *" + relationship.place.replace(/\//g, " ") + "*"            
            if(index2 < display_rels.length - 2) {
              rel_info += ", "
            } else if(index2 == display_rels.length - 2)  {
              rel_info += " und "
            } else {
              rel_info += ". "
            }
          })
          if(rel_info != "") {
            info += "/" + Util.capitaliseFirstLetter(bot.name) + "/ " + " aus *" + Util.capitaliseFirstLetter(bot.room.replace(/\//g, " ")) + "* " + rel_info
          }
        })
      
        console.log(info)
      
        // name
        info += "<br><br>Dein Name ist /" + Util.capitaliseFirstLetter(player.name) + "/. "
      
        // städte
        info += "Du hast bereits " + player.cities.length + " von 53 Städten besucht"      
        if(player.cities.length > 0) {
          info += ": "
        }      
        for(var index = 0; index < player.cities.length; index++) {
            info += "*" + Util.capitaliseFirstLetter(player.cities[index]) + "*"
            if(index < player.cities.length - 2) {
              info += ", "
            } 
            if(index == player.cities.length - 2) {
              info += " und "
            }
        }
        info += ". "
      
        // quests
        var quests = ""
        var resolved = 0
        player.quests.forEach(function(quest) {
          if(quest.status == 'active') {
            quests += "/" + Util.capitaliseFirstLetter(quest.questGiver) + "/ hat dich vor kurzem gefragt, ob du an /" + Util.capitaliseFirstLetter(quest.toBot) + "/ in *" + quest.toPlace + "* folgende Nachricht überbringen kannst: '" + quest.message.text + "'.<br>"
          } else if(quest.status == 'resolved') {
            resolved += 1
          }
        })
        if(resolved > 0) {
          info += "Du hast bereits " + resolved + " Nachrichten für einsame Immobilien überbracht."
        }
        info += "<br><br>" + quests

        info += "<br>[zurück zum Spiel]"
        Util.write(socket, player, {name: "System"}, Util.linkify(info), "sender")
      })
      
      break

    case "credits":
      Util.write(socket, player, {name: "System"}, "Credits", "sender", "chapter")

      player.inMenu = true
      player.save()
      
      text = "Ein Spiel von /Invisible Playground/, frei nach dem Roman 'Anarchie in Ruhrstadt' von /Jörg Albrecht/. Game-Design: /Sebastian Quack/, /Holger Heissmeyer/, /Daniel Boy/, /Christiane Hütter/. Recherchen: /Christina Prfötschner/. Programmierung: /Sebastian Quack/ und /Holger Heissmeyer/. Grafik: /V2A.net/. Eine Produktion von /Ringlokschuppen Ruhr/ und /Urbane Künste Ruhr/ in Kooperation mit dem /Theater Oberhausen/. Gefördert vom Ministerium für Familie, Kinder, Jugend, Kultur und Sport des Landes Nordrhein-Westfalen, im Fonds Doppelpass der Kulturstiftung des Bundes und von der Kunststiftung NRW. [zurück zum Spiel]"
      
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      
      break
            
    case "bedingungen":
      Util.write(socket, player, {name: "System"}, "Nutzungsbedingungen", "sender", "chapter")
      
      text = "Das Spiel verwendet Cookies, um Nutzer wiederzuerkennen. Zur Verfolgung von Mißbrauch werden die IP-Adressen der Nutzer gespeichert. Dialog-Elemente der /Immobilien/ werden durch Nutzer eingegeben. Bitte geben Sie keine sensiblen Daten in das Spiel ein. Hinweise auf problematische Inhalte an /max.grafe@ringlokschuppen.de/ [zurück zum Spiel]"
      
      player.inMenu = true
      player.save()
      
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      
      break

    case "theatertour":
      Util.write(socket, player, {name: "System"}, "Die Theatertour", "sender", "chapter")
      
      text = "Dieses Webspiel ist Teil der 54. Stadt, einer spektakulären Theatertour von /kainkollektiv/, /LIGNA/, /Invisible Playground/ und /copy & waste/, die vom 12.-14. September 2014 in *Mülheim* und *Oberhausen* stattfinden wird. Infos und Karten unter /ringlokschuppen.ruhr/ [zurück zum Spiel]"
      
      player.inMenu = true
      player.save()
      
      
      Util.write(socket, player, {name: "System"}, Util.linkify(text), "sender")
      
      break

    default:
      return false
  }
  return true
  
}

/* expose functionality */
module.exports.handleInput = handleInput
