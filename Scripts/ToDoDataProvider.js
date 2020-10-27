const { ToDoListItem } = require("./ToDoListItem.js");

module.exports.ToDoDataProvider = class ToDoDataProvider {
  constructor() {
    const GROUP_BY = "file"; // Could also be "tag".
    
    let rootItems = [];
    
    console.clear();
    
    let workspaceFiles = this.getDirectoryFilePaths(nova.workspace.path);
    workspaceFiles.sort(this.sortByFileName);
    
    let toDoListItems = this.findToDoItemsInFilePathArray(workspaceFiles);
    
    if (GROUP_BY == "file") {
      var groupedtoDoListItems = this.groupListItemsByFile(toDoListItems);
    } else {
      // add ToDoListItem object called ToDo and type as ToDo
      // For each ToDoListItem with type of ToDo add todos as child
      
      // add ToDoListItem object called FixMe and type as FixMe
      // For each ToDoListItem object with type of FixMe add fixme as child
    }
    
    groupedtoDoListItems.forEach((toDoListItem) => {
      rootItems = [...rootItems, toDoListItem];
    });

    this.rootItems = rootItems; 
  }
  
  /*
    Accepts an ungrouped array of ToDoListItem objects and
    returns an array of ToDoListItem objects grouped by file.
  */
  groupListItemsByFile(toDoListItems) {
    let groupedtoDoListItems = [];
    let distinctFilePaths    = this.getUniqueFiles(toDoListItems);
    
    distinctFilePaths.forEach((distinctFilePath) => {
      groupedtoDoListItems.push(new ToDoListItem(nova.path.basename(distinctFilePath)));
      groupedtoDoListItems[groupedtoDoListItems.length - 1].filePath = distinctFilePath;
      
      let filePathToDoItems = toDoListItems.filter(
        toDoListItem => toDoListItem.filePath == distinctFilePath
      );
      
      filePathToDoItems.forEach(filePathToDoItem => {
        groupedtoDoListItems[groupedtoDoListItems.length - 1].addChild(filePathToDoItem);
      });
    });
    
    return groupedtoDoListItems;
  }
  
  /*
    Searches an array of files for "TODO" or "FIXME"
    keywords and returns an array of ToDoListItem objects
    for all specified files. Accepts an array of file path string.
  */
  findToDoItemsInFilePathArray(filepathArray) {
    let toDoListItemArray = [];
    
    filepathArray.forEach((filepath) => {
      let file = nova.fs.open(filepath);
      let fileSearchResults = this.findKeywordsInFile(file);
      
      if (fileSearchResults.length > 0) {
        toDoListItemArray = toDoListItemArray.concat(fileSearchResults);
      }
      
      file.close();
    });
    
    return toDoListItemArray;
  }
  
  /*
    Searches a file line by line for "TODO" or "FIXME"
    keywords and returns an array of ToDoListItem objects
    for a specific file. Accepts a Nova file object.
  */
  findKeywordsInFile(file) {
    let contents = file.readlines();
    
    let fileMatches = [];

    for(let i = 0; i < contents.length; i++) {
      let lineMatches = this.findKeywordsInLine(contents[i]);
      
      lineMatches.forEach((match) => {
        let toDoListItem      = new ToDoListItem(match.name);
        toDoListItem.filePath = file.path;
        toDoListItem.line     = i + 1;
        toDoListItem.column   = match.column;
        toDoListItem.comment  = match.comment.trim();
        
        fileMatches = fileMatches.concat(toDoListItem); 
      });
    }
    
    return fileMatches;
  }
  
  /*
    Searches a line of code for "TODO" or "FIXME" keywords
    and returns an array of objects containing the keyword,
    column number of the match as well as the text
    (most likely a comment) following the keyword.
  */
  findKeywordsInLine(line) {
    const KEYWORDS = ["TODO", "FIXME"];
    
    let lineMatches = [];
    
    KEYWORDS.forEach((keyword) => {
      let lineMatchIndex = line.indexOf(keyword);
      
      while(lineMatchIndex >= 0) {
        lineMatches.push(
          {
            name: keyword,
            column: lineMatchIndex + 1,
            comment: line.substring(lineMatchIndex)
          }
        );
        
        lineMatchIndex = line.indexOf(keyword, (lineMatchIndex + 1)); 
      }
    });
    
    return lineMatches;
  }
  
  sortByFileName(a, b) {
    a = nova.path.basename(a).toLowerCase();
    b = nova.path.basename(b).toLowerCase();
    
    return a > b ? 1 : b > a ? -1 : 0;   
  }
  
  /*
    Accepts an array of ToDoListItem objects and returns an array
    of primitive file name values.
  */
  getUniqueFiles(toDoListItems) {
    // 1) Map array to a new array containing only primitive values (don't want objects, just file names.
    // 2) Then use the Set object to store a collection of unique values,
    // 3) Which then uses the spread operator to construct a new array.
    return [...new Set(toDoListItems.map(item => item.filePath))];
  }
  
  /*
    Returns an array of all files within a directory and its
    subdirectories, except for specified ignored files.
  */
  getDirectoryFilePaths(directoryPath) {
    const IGNORES = [".git", ".gitignore", ".nova", "ToDoDataProvider.js", "extension.json"];
    
    let directoryItems = nova.fs.listdir(directoryPath);
    let directoryFiles = [];
    
    for(let i = 0; i < directoryItems.length; i++) {
      let currentEvaluationPath = nova.path.join(directoryPath, directoryItems[i]);
  
      if (!IGNORES.includes(directoryItems[i])) {
        if (nova.fs.stat(currentEvaluationPath).isFile()) {
          directoryFiles.push(currentEvaluationPath);
        } else if (nova.fs.stat(currentEvaluationPath).isDirectory())  {
          let subDirectories = this.getDirectoryFilePaths(currentEvaluationPath);
          
          if (subDirectories.length > 0) {
            directoryFiles = directoryFiles.concat(subDirectories);
          }
        }
      }
    }
    
    return directoryFiles;
  }
  
  getChildren(toDoListItem) {
    if (!toDoListItem) {
      return this.rootItems;
    }
    else {
      return toDoListItem.children;
    }
  }
  
  getParent(toDoListItem) {
    return toDoListItem.parent;
  }
  
  getTreeItem(toDoListItem) {
    let item = new TreeItem(toDoListItem.name);
    
    if (toDoListItem.children.length > 0) {
      item.collapsibleState = TreeItemCollapsibleState.Expanded;
      item.image            = `__filetype${nova.path.extname(toDoListItem.filePath)}`;
      item.contextValue     = "fruit";
      item.tooltip          = "This is a parent.";
    } else {
      item.image            = "__symbol.todo";
      item.command          = "todo.doubleClick";
      item.contextValue     = "info";
      item.descriptiveText  = 
        `${toDoListItem.comment} (Ln: ${toDoListItem.line}, Col: ${toDoListItem.column})`;
      item.tooltip          = "This is a parent.";
    }
    
    return item;
  }
}
