import { Component, Input, OnInit } from '@angular/core';
import { CpaStructur, CpaValueStructur, OtherStructur } from '../app-config';
import { FileTransferService, QueryNeo4jService } from '../app-services';

@Component({
  selector: 'app-unit-create-instance',
  templateUrl: './unit-create-instance.component.html',
  styleUrls: ['./unit-create-instance.component.css']
})
export class UnitCreateInstanceComponent implements OnInit {
  currentFileName: string = ''
  error: { [key: string]: string } = { fileName: '', cpaIndex: '' }

  @Input() defaultData!: CpaStructur | OtherStructur
  @Input() data_type!: 'pre_data' | 'post_data' | 'cpa' | 'exp' | 'process';

  newFileData!: any //CpaValueStructur | OtherStructur

  createdFiles: { file_name: string, result: string, neo4j: string }[] = [];

  selectedFiles: { [key: string]: string } = {}

  memory: { [fileName: string]: [CpaValueStructur | OtherStructur, string[]] } = {}

  deletedItems: string[] = []

  currrentKey: string = ''

  //only for cpa
  currentType: 'DSC' | 'FTIR' | 'Kryomikroskopie' | 'Osmolalität' | 'Viskosität' | string = 'DSC'
  currentCpaIndex: string = ''

  constructor(
    private fileTransferService: FileTransferService,
    private queryNeo4jService: QueryNeo4jService
  ) {

  }

  ngOnInit(): void {
    this.error = { fileName: '', cpaIndex: '' }
    this.createdFiles = []
    this.selectedFiles = {}
    this.memory = {}
    this.deletedItems = []
    this.currentFileName = ''
    this.currrentKey = ''
    this.currentCpaIndex = ''
    this.currentType = 'DSC'
    if (this.data_type == 'cpa') {
      this.newFileData = { ...this.defaultData }[this.currentType]
      this.newFileData = { ...this.newFileData }
    } else {
      this.newFileData = { ...this.defaultData }
    }
  }

  selectedOrNot(file: { file_name: string, result: string, neo4j: string }) {
    if (file.neo4j == 'undo') {
      return false
    }
    else {
      return true
    }
  }

  onSelected(event: any) {
    if (event['options'][0]['_selected']) {
      this.selectedFiles[event['options'][0]['_value']] = 'waiting'
    } else {
      this.selectedFiles[event['options'][0]['_value']] = 'undo'
    }
  }

  deleteAll() {
    if (confirm(`All about ${this.data_type} that not saved in the database will be lost! Are you sure to continue?`)) {
      this.ngOnInit()
    }
  }

  feedToDB() {
    for (var file_name in this.selectedFiles) {
      if (this.selectedFiles[file_name] == 'waiting') {
        var self = this;
        (function (fileName: string) {
          self.queryNeo4jService.feedNeo4j(self.data_type, fileName).then((res: any) => {
            self.selectedFiles[fileName] = res;
          }).finally(() => {
            self.selectedFiles = { ...self.selectedFiles };
          });
        }).call(this, file_name);
      }
    }
  }

  addNewItem() {
    this.currrentKey = ''
    this.newFileData[this.currrentKey] = ''
    //this.newFileData = {...this.newFileData}
  }

  updateKey() {
    delete this.newFileData['']
    this.newFileData[this.currrentKey] = ''
  }

  checkFileName() {
    if (this.currentFileName.includes('/') || this.currentFileName.includes('\\') || this.currentFileName.includes('.')) {
      this.error['fileName'] = 'type1'
    } else if (this.currentFileName == '') {
      this.error['fileName'] = 'type2'
    } else {
      this.error['fileName'] = 'none'
    }
  }

  checkCpaIndex() {
    if (this.currentCpaIndex.includes('/') || this.currentCpaIndex.includes('\\') || this.currentCpaIndex.includes('.')) {
      this.error['cpaIndex'] = 'type1'
    } else if (this.currentCpaIndex == '') {
      this.error['cpaIndex'] = 'type2'
    } else {
      this.error['cpaIndex'] = 'none'
    }
  }

  newFile() {
    if (this.data_type != 'cpa') {
      this.currentCpaIndex = 'default'
    }

    if (this.currentFileName != '' && this.currentCpaIndex != '') {
      if (this.error['fileName'] == 'none') {
        delete this.newFileData['']
        if (this.data_type != 'cpa') {
          this.currentFileName = `${this.currentFileName}.txt`
        } else {
          this.currentFileName = `${this.currentCpaIndex}/${this.currentType}/${this.currentFileName}.txt`
        }

        this.memory[this.currentFileName] = [{ ...this.newFileData }, this.deletedItems]

        for (let deletedItem of this.deletedItems) {
          delete this.newFileData[deletedItem]
        }

        this.deletedItems = []
        this.fileTransferService.fileCreate(this.currentFileName, this.data_type, this.newFileData).then((res) => {
          this.createdFiles = [...this.createdFiles.filter(item => item.file_name !== JSON.parse(res.replace(/'/g, '"'))[0].file_name)]
          this.createdFiles.push(...(JSON.parse(res.replace(/'/g, '"'))))
          this.selectedFiles[this.currentFileName] = this.createdFiles[this.createdFiles.length - 1]['neo4j']
          this.currentFileName = ''
          this.currentCpaIndex = ''
          this.currentType = 'DSC'
          if (this.data_type == 'cpa') {
            this.newFileData = { ...this.defaultData }[this.currentType]
            this.newFileData = { ...this.newFileData }
          } else {
            this.newFileData = { ...this.defaultData }
          }
        })
      }
    } else {
      if (this.currentFileName == '') {
        this.error['fileName'] = 'type2'
      }
      if (this.currentFileName == '') {
        this.error['cpaIndex'] = 'type2'
      }
    }
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  deleteItem(itemKey: string) {
    if (itemKey == '') {
      delete this.newFileData['']
    } else {
      if (this.deletedItems.indexOf(itemKey) == -1) {
        this.deletedItems.push(itemKey)
        this.deletedItems = [...this.deletedItems]
      }
    }
  }

  undoItem(itemKey: string) {
    if (itemKey == '') {
      this.addNewItem()
    } else {
      if (this.deletedItems.indexOf(itemKey) != -1) {
        this.deletedItems = this.deletedItems.filter(item => item !== itemKey);
      }
    }

  }

  reloadConfigFile() {
    if (this.data_type == 'cpa') {
      this.newFileData = { ...this.defaultData }[this.currentType]
      this.newFileData = { ...this.newFileData }
    } else {
      this.newFileData = { ...this.defaultData }
    }
    this.currentFileName = ''
    this.currentCpaIndex = ''
    this.deletedItems = []
    this.error = { fileName: '', cpaIndex: '' }
  }

  editCreatedFiles(fileName: string) {
    this.newFileData = this.memory[fileName][0]
    if (this.data_type == 'cpa') {
      this.currentCpaIndex = fileName.split('/')[0]
      this.currentType = fileName.split('/')[1]
      this.currentFileName = fileName.split('/')[2].split('.')[0]
    } else {
      this.currentFileName = fileName.split('.')[0]
    }

    this.deletedItems = this.memory[fileName][1]
    delete this.memory[fileName]
    delete this.selectedFiles[fileName]
    this.createdFiles = this.createdFiles.filter(item => item.file_name != fileName)
  }

  onSelecteChips(event: any) {
    this.currentType = event['value']
    if (!this.currentType) {
      this.currentType = 'DSC'
    }
    this.reloadConfigFile()
  }

  isString(value: any): boolean {
    return typeof value === 'string';
  }
  toString(value: {[key: string]: []} | string) {
    return JSON.stringify(value)
  }
}