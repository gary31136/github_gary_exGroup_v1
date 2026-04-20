/*:
 * @target MZ
 * @plugindesc v1.4 任務顯示 HUD（右上角常駐，多行＋變數自動更新）
 * @author OpenAI
 *
 * @help
 * 在畫面右上角顯示目前任務、內容與進度。
 *
 * 使用方式：
 * 1. 檔名請存成 TaskHud.js
 * 2. 放到 js/plugins/
 * 3. 到插件管理器啟用
 *
 * 本版本特色：
 * 1. 支援多行內容
 * 2. 支援 \V[n] 顯示變數
 * 3. 任務只需設定一次，之後變數改變會自動更新畫面
 *
 * 範例：
 * 標題：歷史線索
 * 內容：
 * 漢人線索：\V[11]/5
 * 原住民線索：\V[12]/5
 * 荷蘭線索：\V[13]/5
 *
 * @param HudX
 * @text HUD X座標（0=自動靠右）
 * @type number
 * @default 0
 *
 * @param HudY
 * @text HUD Y座標
 * @type number
 * @default 20
 *
 * @param HudWidth
 * @text HUD寬度
 * @type number
 * @default 340
 *
 * @param HudHeight
 * @text HUD高度
 * @type number
 * @default 180
 *
 * @param HudOpacity
 * @text 背景透明度
 * @type number
 * @min 0
 * @max 255
 * @default 220
 *
 * @param FontSizeTitle
 * @text 標題字體大小
 * @type number
 * @default 22
 *
 * @param FontSizeBody
 * @text 內容字體大小
 * @type number
 * @default 20
 *
 * @param TitleColor
 * @text 標題顏色索引
 * @type number
 * @default 6
 *
 * @command SetTask
 * @text 設定任務
 *
 * @arg title
 * @text 標題
 * @type string
 * @default 目前任務
 *
 * @arg body
 * @text 內容
 * @type multiline_string
 * @default 請輸入任務內容
 *
 * @arg progress
 * @text 進度
 * @type string
 * @default
 *
 * @command ShowTask
 * @text 顯示任務
 *
 * @command HideTask
 * @text 隱藏任務
 *
 * @command ClearTask
 * @text 清除任務
 */

(() => {
  const pluginName = "TaskHud";
  const params = PluginManager.parameters(pluginName);

  const HUD_W = Number(params["HudWidth"] || 340);
  const HUD_H = Number(params["HudHeight"] || 180);
  const HUD_Y = Number(params["HudY"] || 20);
  const HUD_X_PARAM = Number(params["HudX"] || 0);
  const HUD_OPACITY = Number(params["HudOpacity"] || 220);
  const FONT_SIZE_TITLE = Number(params["FontSizeTitle"] || 22);
  const FONT_SIZE_BODY = Number(params["FontSizeBody"] || 20);
  const TITLE_COLOR = Number(params["TitleColor"] || 6);

  function taskHudDefaultData() {
    return {
      title: "",
      body: "",
      progress: "",
      visible: false
    };
  }

  function ensureTaskHudData() {
    if (!$gameSystem) return null;
    if (!$gameSystem._taskHudData) {
      $gameSystem._taskHudData = taskHudDefaultData();
    }
    return $gameSystem._taskHudData;
  }

  const _Game_System_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function () {
    _Game_System_initialize.call(this);
    this._taskHudData = taskHudDefaultData();
  };

  Game_System.prototype.taskHudData = function () {
    if (!this._taskHudData) {
      this._taskHudData = taskHudDefaultData();
    }
    return this._taskHudData;
  };

  Game_System.prototype.setTaskHud = function (title, body, progress) {
    const data = this.taskHudData();
    data.title = title || "";
    data.body = body || "";
    data.progress = progress || "";
    data.visible = true;
  };

  Game_System.prototype.showTaskHud = function () {
    this.taskHudData().visible = true;
  };

  Game_System.prototype.hideTaskHud = function () {
    this.taskHudData().visible = false;
  };

  Game_System.prototype.clearTaskHud = function () {
    this._taskHudData = taskHudDefaultData();
  };

  PluginManager.registerCommand(pluginName, "SetTask", args => {
    if (!$gameSystem) return;
    const title = String(args.title || "");
    const body = String(args.body || "");
    const progress = String(args.progress || "");
    $gameSystem.setTaskHud(title, body, progress);
  });

  PluginManager.registerCommand(pluginName, "ShowTask", () => {
    if (!$gameSystem) return;
    $gameSystem.showTaskHud();
  });

  PluginManager.registerCommand(pluginName, "HideTask", () => {
    if (!$gameSystem) return;
    $gameSystem.hideTaskHud();
  });

  PluginManager.registerCommand(pluginName, "ClearTask", () => {
    if (!$gameSystem) return;
    $gameSystem.clearTaskHud();
  });

  class Window_TaskHud extends Window_Base {
    initialize() {
      const x = HUD_X_PARAM > 0 ? HUD_X_PARAM : Graphics.boxWidth - HUD_W - 20;
      const rect = new Rectangle(x, HUD_Y, HUD_W, HUD_H);
      super.initialize(rect);
      this.opacity = HUD_OPACITY;
      this._lastRenderedTitle = "";
      this._lastRenderedBody = "";
      this._lastRenderedProgress = "";
      this._lastVisible = false;
      this.visible = false;
      this.refresh();
    }

    update() {
      super.update();
      this.updateContent();
    }

    getTaskData() {
      if (!$gameSystem) return null;
      return ensureTaskHudData();
    }

    updateContent() {
      const data = this.getTaskData();
      if (!data) {
        this.visible = false;
        return;
      }

      const renderedTitle = this.convertEscapeCharacters(data.title || "");
      const renderedBody = this.convertEscapeCharacters(data.body || "");
      const renderedProgress = this.convertEscapeCharacters(data.progress || "");

      this.visible = !!data.visible;

      if (
        this._lastRenderedTitle !== renderedTitle ||
        this._lastRenderedBody !== renderedBody ||
        this._lastRenderedProgress !== renderedProgress ||
        this._lastVisible !== data.visible
      ) {
        this._lastRenderedTitle = renderedTitle;
        this._lastRenderedBody = renderedBody;
        this._lastRenderedProgress = renderedProgress;
        this._lastVisible = data.visible;
        this.refresh();
      }
    }

    refresh() {
      if (!this.contents) return;
      this.contents.clear();

      const data = this.getTaskData();
      if (!data) return;

      const title = this.convertEscapeCharacters(data.title || "");
      const body = this.convertEscapeCharacters(data.body || "");
      const progress = this.convertEscapeCharacters(data.progress || "");

      let y = 0;

      this.contents.fontSize = FONT_SIZE_TITLE;
      this.changeTextColor(ColorManager.textColor(TITLE_COLOR));
      this.drawText(title, 0, y, this.contentsWidth(), "left");

      y += FONT_SIZE_TITLE + 8;

      this.contents.fontSize = FONT_SIZE_BODY;
      this.resetTextColor();

      const lines = body.split("\n");
      for (const line of lines) {
        this.drawText(line, 0, y, this.contentsWidth(), "left");
        y += FONT_SIZE_BODY + 6;
      }

      if (progress) {
        y += 4;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("進度：", 0, y, 64, "left");
        this.resetTextColor();
        this.drawText(progress, 64, y, this.contentsWidth() - 64, "left");
      }
    }
  }

  const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
  Scene_Map.prototype.createAllWindows = function () {
    _Scene_Map_createAllWindows.call(this);
    this.createTaskHudWindow();
  };

  Scene_Map.prototype.createTaskHudWindow = function () {
    this._taskHudWindow = new Window_TaskHud();
    this.addWindow(this._taskHudWindow);
  };
})();