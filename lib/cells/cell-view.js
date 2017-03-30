'use babel'

import { CompositeDisposable, Emitter } from 'event-kit'
//$$ = require('atom-space-pen-views').$$
//{$} = require 'atom-space-pen-views'
import { $, $$ } from 'atom-space-pen-views';

class CellView extends HTMLElement {
  initialize (cell) {
    this.cell = cell
    this.subscriptions = new CompositeDisposable()

    this.classList.add('entry', 'list-nested-item')
    this.id = cell.id
    this.item = document.createElement('span')
    this.item.classList.add('name', 'list-item')
    if (cell.result === "0") {
      this.item.classList.add('text-error')
    }
    this.appendChild(this.item)
    this.item.textContent = cell.name

    if (cell.field.length > 0) {
      $(this.item).append(this.initFields())
      console.log ('field', this.item)
    } else if (cell.actual != '') {
      let actual = $('<div>').addClass('actual').html(cell.actual)
      $(this.item).append(actual)
    }
  }

  initFields () {
    this.fields = document.createElement('div')
    for (item in this.cell.field) {
      this.field = document.createElement('div')
      if (item.name != 'field-general')
        name = item.name + ':'
      else
        name = ''
      this.field.innerHTML = `
        #{name}
        #{item.expected},
        #{item.actual}
      `
      if (item.result == 'failed'){
        this.field.classList.add ('failed')
      }
      this.fields.appendChild (this.field)
      console.log ('cell', this.field)
    }
    return this.fields
  }

  getCell () {
    return this.row
  }
}

module.exports = document.registerElement('smartcsv-view-cell', {prototype: CellView.prototype, extends: 'div'})