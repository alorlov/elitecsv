'use babel'

const JsTee = require('jstree');

let _s, fs, Q;
import { Point, CompositeDisposable, Emitter } from 'atom';
import _ from 'underscore-plus';
let $$ = fs = _s = Q = null;
import ResizableView from './resizable-view';
import { $, View } from 'atom-space-pen-views';
import Cell from './cells/cell';
import CellView from './cells/cell-view';
import CheckCellView from './cells/check-cell-view'
import ScreenshotView from './cells/screenshot-view'
import ScreenshotImageView from './cells/screenshot-image-view'

let Database = require('./database')
fs = require('fs')
let base64 = require('base64')

const Range = require('./tablr-hooks/range')

export default class ReportView extends ResizableView {

  static innerContent() {
    return this.div({id: 'elitecsv', class: 'padded'}, () => {
      this.div({outlet: 'list', class: 'list-group'});
      return this.div({outlet: 'throbber', class: 'throbber loading loading-spinner-small inline-block', style: 'display: none'});
    })
  }

  initialize(serializeState) {
    super.initialize(serializeState);
    this.scenariosDir = atom.config.get('elitecsv.projectPath') + "/TestScenarios"

    this.roots = []
    this.reports = {}
    this.firstRow = null

    this.subscriptions = new CompositeDisposable();

    this.showOnRightSide = atom.config.get('elitecsv.showOnRightSide')
    atom.config.onDidChange('elitecsv.showOnRightSide', ({newValue}) => {
      return this.onSideToggled(newValue);
    }
    );

    atom.commands.add('atom-workspace', 'elitecsv:toggle', () => this.toggle());

    let activePane = atom.workspace.getActivePane();
    if (activePane) { this.setEditor(activePane.activeItem); }

    atom.workspace.onDidChangeActivePaneItem(item => {
      if (item && item.editor != null) {
        this.changePane(item)
      }
    })

    atom.workspace.onDidDestroyPaneItem(({item}) => {
      if (item && item.editor != null) {
        let path = item.getPath()
        if(this.getReport(path)) {
          this.removeReport(path)
          this.checkReport()
        }
      }
    })

    return;
    this.visible = localStorage.getItem('coffeeNavigatorStatus') === 'true';
    if (this.visible) {
      return this.show();
    }
  }

  serialize() {}

  destroy() {
    return this.detach()
  }
    //@fileWatcher?.dispose()

  toggle() {
    if (this.isVisible()) {
      this.detach();
    } else {
      this.show();
    }

    //return localStorage.setItem('coffeeNavigatorStatus', this.isVisible());
  }

  show() {
    this.attach();

    /*const JsTee = require('jstree');

    this.list.jstree({
      "core" : {

        "check_callback" : true,
       'data' : [
                {"id" : 1, "text" : "Node 1", data : {pos: 4}},
                {"id" : 2, "text" : "Node 2", data : {pos: 4}},
            ]
      },
    })
    .on('changed.jstree', (e, data) => {
      data = data.node.data
      this.csvEditor.editor.setCursorAtScreenPosition([data.pos,5])
      this.table = atom.views.getView(this.csvEditor.editor)
      this.table.afterCursorMove()
      console.log(e, data)
    })
    ref = this.list.jstree(true)
    var newID = ref.create_node('1', { "text" : "Child node cust", data : {pos: 4} })
    newID = ref.create_node('1', { "text" : "Child node cust", data : {pos: 5} })
    newID = ref.create_node('2', { "text" : "Child node cust", data : {pos: 6} })
    //ref.select_node(newID)
    this.on('click', this.list, () => {

      //ref.select_node('1')
      //sel = ref.get_selected()
      //var newID = ref.create_node('1', { "text" : "Child node cust" })
      //ref.select_node(newID)
      //console.log(newID)
    })
    */

    return this.focus();
  }

  attach() {
    if (_.isEmpty(atom.project.getPaths())) { return; }
    //this.panel = atom.workspace.addRightPanel({item: this})
    //return this.panel
    return this.panel != null ? this.panel : (this.panel =
      atom.config.get('elitecsv.showOnRightSide') ?
        atom.workspace.addRightPanel({item: this})
      :
        atom.workspace.addLeftPanel({item: this}));
  }

  detach() {
    if (this.isVisible()) {
      this.panel.destroy()
      return this.panel = null;
    }
  }

  handleEvents() {
    super.handleEvents()

    atom.commands.add('tablr-editor',
     {
       'elitecsv:toggle-report': () => this.toggle(),
     })

    return this.on('click', '.entry', e => {
      console.log(e);
      console.log(this.csvEditor);
      //@csvEditor.editor.deleteRowAtCursor()
      // This prevents accidental collapsing when a .entries element is the event target
      if (e.target.classList.contains('entries')) { return; }

      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) { return this.entryClicked(e); }
    }
  );
}

  entryClicked(e) {
    let entry = e.currentTarget;
    let { cell } = entry;

    this.table = atom.views.getView(this.csvEditor.editor)
    this.setCursorAtPosition([cell.row, this.getColumnByWorkcol(cell.column)]);
    this.table.afterCursorMove()

    if (cell.screenshot != "") {
      this.showScreenshot(cell.screenshot)
    }

    return false
  }

  start() {
    this.throbber.show()
  }

  stop() {
    this.throbber.hide()
  }

  onSideToggled(newValue) {
    return alert('onSideToggled');
  }

  getPath() {
    return this.csvEditor.getPath().replace(/\\/g, '/');
  }

  getName() {
    let path = this.getPath();
    let name = path.slice(path.lastIndexOf(this.scenariosDir) + this.scenariosDir.length);
    name = name.replace(/^\//, '');
    return name.substr(0, name.lastIndexOf('.'));
  }

  getHumanName() {
    return this.getName().replace('/', '-');
  }

  setEditor(csvEditor) {
    return this.csvEditor = csvEditor;
  }

  hideAll() {
    this.list.children('div').hide()
  }

  checkReport() {
    var pane = atom.workspace.getActivePaneItem()
    if(!pane) {
      this.hideAll()
    }
  }

  changePane (item) {
    this.setEditor(item)
    let path = this.getPath()
    if(this.getReport(path) != null) {
      this.showReport(path)
    } else {
      this.detach()
    }
  }

  showReport (path, suf = null) {
    let report = this.getReport(path, suf)
    this.hideAll()
    this.highlightEditorByReport(this.getReportModel(path, suf))
    report.show()
    this.show()
  }

  highlightEditorByReport(data) {
    this.colorRows = {}
    for (r of data) {
      if (r.row > -1 && r.col > -1 && r.type != 'report-case-new') {
        let color = r.result == 0 ? 'failed' : 'passed'
        if(!this.colorRows.hasOwnProperty(r.row)) {
          this.colorRows[r.row] = {}
        }
        this.colorRows[r.row][r.col] = color
      }
    }

    let self = this

    this.subscriptions.add(this.csvEditor.onDidChangeModified(() => {
      let editor = this.csvEditor.editor

      let columns = editor.getScreenColumns()
      let colorRows = self.colorRows
      for (column in columns) {
        var cellRender = columns[column].cellRender
        columns[column].cellRender = function(cell, position) {
          let value = cell.value
          value = cellRender.apply(this, arguments)

          if (self.csvEditor.editor == null) {
            return value
          }

          if (value === undefined) {
            value = ''
          }
          let [row, column] = position
          let workColumn = self.getWorkcolByColumn(column)
          if(colorRows.hasOwnProperty(row)) {
            if(colorRows[row].hasOwnProperty(workColumn)) {
              let color = colorRows[row][workColumn]
              return `<span class='${color}'>${value}</span>`
            }
          }
          return `${value}`
        }
      }
      editor.displayTable.updateScreenRows()
    }))
  }

  getReport(path, suf = null) {
    var report = this.reports[path]
    if(!report) {
      return null
    }
    if(suf == null) {
      suf = report.active
    }
    return report.list[suf]
  }

  getReportModel(path, suf = null) {
    var report = this.reports[path]
    if(!report) {
      return null
    }
    if(suf == null) {
      suf = report.active
    }
    return report.models[suf]
  }

  addReport(path, data = [], suf = 'live') {
    let report = $('<div>').addClass('list-tree has-collapsable-children'),
        reportPath = this.reports[path]
    if(!reportPath) {
      reportPath = {list: {}, active: '', models: {}}
      this.reports[path] = reportPath
    }
    reportPath.list[suf] = report
    reportPath.models[suf] = data
    reportPath.active = suf

    if (data.length > 0) {
      this.updateReport(report, data)
    }

    report.prepend($('<div>').addClass('screenshot-links'))

    this.list.append(report)

    class List extends View{
      static content() {
        return this.div({id: 'elitecsv', class: 'padded'}, () => {
          return this.div({outlet: 'list', class: 'tree'});
        })
      }

    }

    return report
    /*report.jstree({
      "core" : {
        "check_callback" : true,
        "data" : [
                  {"id" : 1, "text" : "Node 1", data : {pos: 3}},
                  {"id" : 2, "text" : "Node 2", data : {pos: 4}},
              ],
        "data" : data
      },
    })
    .on('changed.jstree', (e, data) => {
      data = data.node.data
      this.csvEditor.editor.setCursorAtScreenPosition([data.pos,2])
      this.table = atom.views.getView(this.csvEditor.editor)
      this.table.afterCursorMove()
      console.log(e, data)

    })*/
  }

  updateReportLive(path, object) {
    //CompositeDisposable = require('atom').CompositeDisposable
    //@subscriptions = new CompositeDisposable
    //@subscriptions.add @csvEditor.editor.onDidChangeCursorPosition({newPosition, oldPosition}) =>
    //  alert(33)
    let existRows;
    let lastID = 0;
    this.updateReport(this.getReport(path, 'live'), object)
    this.scroller.scrollDown()
    return lastID;
  }


  updateReport(report, data) {
    let cell, view
    for (r of data) {
      cell = new Cell(r)
      switch (r.type) {
        case 'check': view = new CheckCellView(); break;
        case 'checkAttr': view = new CheckCellView(); break;
        case 'no': view = new CheckCellView(); break;
        default: view = new CellView(); break;
      }
      view.initialize(cell)

      let existRows = report.children(`#${cell.id}`)
      if(existRows.length > 0) {
        existRows.html(view)
      } else {
        report.append(view)
      }
    }
  }

  removeReport(path) {
    var report = this.reports[path]
    if(report) {
      for (var suf in report.list) {
        if (report.list.hasOwnProperty(suf)) {
          report.list[suf].detach()
        }
      }
      //report.detach()
    }
  }


    /*csvEditor = this.csvEditor

    this.subscriptions.add @csvEditor.onDidOpen () =>
      table = csvEditor.editor.getTable()

      *@subscriptions.add csvEditor.editor.onDidChangeModified () =>
      *  console.log 'updated'
        *csvEditor.editor.displayTable.updateScreenRows()

      columns = csvEditor.editor.getScreenColumns()
      for column in columns
        column.cellRender = (cell, position) ->
          isCase = table.getValueAtPosition [position[0], 0]
          isVar = table.getValueAtPosition [position[0], 2]
          if isCase != '' and isCase != '-'
            console.log 1,isCase, isVar, position
            "<div style='color: yellow'>#{cell.value}</div>"
          else if isVar != ''
            console.log 2,isCase, isVar, position
            "<div style='color: green'>#{cell.value}</div>"
          else
            console.log 3,isCase, isVar, position
            "#{cell.value}"
    */
  save() {
    return this.csvEditor.editor.save();
  }

  splitRangesToRows(ranges) {
    let rows = {};
    for (let range of ranges) {
      for(let i = range.start.row; i <= range.end.row; i++) {
        rows[i] = []
        for(let j = range.start.column; j <= range.end.column; j++) {
          rows[i].push(j)
        }
      }
    }
    return rows
  }

  splitSelectedToRows() {
    let ranges = this.csvEditor.editor.getSelectedRanges();
    // reduce range.end.{row,column} on -1 in order to TableEditor native behavior
    for (let range of ranges) {
      range.end.row--
      range.end.column--
      range.start.column = this.getWorkcolByColumn(range.start.column)
      range.end.column = this.getWorkcolByColumn(range.end.column)
    }
    return this.splitRangesToRows(ranges)
  }
  splitFromCursorToRows() {
    let editor = this.csvEditor.editor,
        cursorPosition = editor.getCursorPosition(),
        lastRow = editor.getLastRowIndex(),
        nextRow = cursorPosition.row < lastRow ? cursorPosition.row + 1 : lastRow,
        currentRow = cursorPosition.row,

        currentCol = cursorPosition.column,
        firstCol = this.getColumnByWorkcol(1),
        lastCol = editor.getLastColumnIndex(),
        currentWorkcol = this.getWorkcolByColumn(currentCol),
        firstWorkcol = 1,
        lastWorkcol = this.getWorkcolByColumn(lastCol)

    let range = new Range(new Point(currentRow, firstWorkcol), new Point(lastRow, lastWorkcol))
    let rows = this.splitRangesToRows([range])
    // cut columns before current on current row
    for(var i = firstWorkcol; i < currentWorkcol; i++) {
      rows[currentRow].splice( rows[currentRow].indexOf(i), 1 )
    }
    return rows
  }

  getFirstRow() {
    if(this.firstRow != null) {
      //return this.firstRow
    }
    let row = _.clone(this.csvEditor.editor.table.getFirstRow())
    let columns = this.csvEditor.editor.table.getColumns()
    let nextColName = 1;
    for (var i = 0, name; i < columns.length; i++) {
    // for (let i of __range__(0, columns.length, true)) {
      if (i < row.length) {
        name = row[i]
      } else {
        name = ''
      }
      if (!isNaN(name * 1)) {
        row[i] = (nextColName++).toString();
      }
    }
    this.firstRow = row
    return row;
  }

  getColumnByWorkcol(column) {
    let firstRow = this.getFirstRow()
    return firstRow.indexOf(column.toString()) * 1
  }

  getWorkcolByColumn(column) {
    let firstRow = this.getFirstRow()

    if (column > firstRow.length - 1) {
      return firstRow[firstRow.length - 1]
    }

    return firstRow[column] * 1
  }

  setCursorAtPosition(position) {
    return this.csvEditor.editor.setCursorAtPosition(position);
  }

  // addScreenshotLinks (reportElement, list) {
  //   for (r of list) {
  //     let view = new ScreenshotView()
  //     view.initialize({
  //       id: r.id,
  //       comment: r.comment,
  //       type: "screenshot"
  //     })
  //
  //     reportElement.children('.screenshot-links').append(view)
  //   }
  // }

  showScreenshot (id) {
    let database = new Database()
    database.query(`Select data From run_screenshot Where id = ${id}`)
    .then(rows => {
      for (row of rows) {
        let data = row.data
        let src = atom.config.get('elitecsv.projectPath') + `/tmp/jf-${id + '-' + this.getHumanName()}.jpg`
        fs.writeFile(src, data, (err) => {
          if (err) throw err;

          let view = new ScreenshotImageView()
          view.initialize({src: src})

          let editorElement = atom.views.getView(this.csvEditor)
          editorElement.appendChild(view)
        })
      }
    })
  }

  hideScreenshot () {
    this.screenshotElement.style.zIndex = 0
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
