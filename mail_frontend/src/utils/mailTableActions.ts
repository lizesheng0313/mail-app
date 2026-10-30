export const mailTableCommands = [
  'addRowBefore',
  'addRowAfter',
  'deleteRow',
  'addColumnBefore',
  'addColumnAfter',
  'deleteColumn',
  'toggleHeaderRow',
  'toggleHeaderColumn',
  'mergeCells',
  'splitCell',
  'deleteTable'
] as const

export type MailTableCommand = (typeof mailTableCommands)[number]
