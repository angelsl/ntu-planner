(function() {
const cfg = {
    cfg: false,
    setItem: function(key, val) {
        this.init();
        this.cfg[key] = val;
        localStorage.ntuplanner = JSON.stringify(this.cfg);
    },
    getItem: function(key) {
        this.init();

        if (!(key in this.cfg)) {
            return null;
        }

        return this.cfg[key];
    },
    exportJson: function() {
        return JSON.stringify(this.cfg);
    },
    importJson: function(json) {
        this.cfg = JSON.parse(json);
        localStorage.ntuplanner = json;
    },
    init: function() {
        if (!(this.cfg instanceof Object)) {
            this.cfg = JSON.parse(localStorage.ntuplanner || "{}");
        }

        if (!(this.cfg instanceof Object)) {
            this.cfg = {};
        }
    }
};

const slots = (function() {
    // zero pad left
    function zpl(num) {
        return (num < 10 ? "0" : "") + num;
    }

    let ret = [];
    for (let t = 8; t < 23; t++) {
        ret.push(zpl(t) + "30 - " + zpl(t+1) + "00");
        ret.push(zpl(t+1) + "00 - " + zpl(t+1) + "30");
    }

    return ret;
})();

const nSlots = slots.length;
const nDays = 5;
const nWeeks = 13;

const form = {
    getConfig: function() {
        let sp = new TimetableArray(undefined, 0);
        for (let s = 0; s < nSlots; ++s) {
            for (let d = 0; d < 5; ++d) {
                let tsp = this.getSlotPenalty(d, s);
                for (let w = 0; w < nWeeks; ++w) {
                    sp.set(w, d, s, tsp);
                }
            }
        }
        return {
            free: this.getFreeDayBonus(),
            lunch: this.getLunchBonus(),
            slots: sp
        };
    },
    getSlotPenalty: function(day, slot) {
        return parseInt($("#pen" + day + "_" + slot).val() || "0", 10);
    },
    getFreeDayBonus: function() {
        return parseInt($("#optFreeDayBonus").val(), 10);
    },
    getLunchBonus: function() {
        return parseInt($("#optLunchBonus").val(), 10);
    },
    getYear: function() {
        return parseInt($("#optYear").val(), 10);
    },
    getSem: function() {
        return parseInt($("#optSem").val(), 10);
    },
    getResultSlot: function(day, slot) {
        return $("#res" + day + "_" + slot);
    },
    getAddModCode: function() {
        return $("#modsCode").val();
    },
    getLunchStart: function() {
        return parseInt($("#optLunchStart").val(), 10);
    },
    getLunchEnd: function() {
        return parseInt($("#optLunchEnd").val(), 10);
    },
    getLunchSlots: function() {
        return parseInt($("#optLunchSlots").val(), 10);
    },
    getSelectedWeek: function() {
        return Math.min(13, Math.max(1, parseInt($("#resWeek").val(), 10))) - 1;
    },
    setSelectedWeek: function(week) {
        $("#resWeek").val(Math.min(13, Math.max(1, week + 1)));
    },
    getSelectedPerm: function() {
        return $("#resChoose").find("option:selected").data("perm");
    },
    addModPlaceholder: function(code) {
        if ($("#modli_" + code).length > 0) {
            return;
        }
        let elem = $("<li id=\"modli_" + code + "\"><p>" + code + " Loading...</p></li>");
        $("#modsMods").append(elem);
    },
    removeMod: function(code) {
        $("#modli_" + code).remove();
    },
    addModInfo: function(origCode, mod) {
        let elem = $("<li id=\"modli_" + mod.code + "\"><p><label><input type=\"checkbox\" id=\"moden_" + mod.code + "\" checked=\"checked\" /> " + mod.code + " " + mod.title + "</label> <a target=\"_blank\" href=\"http://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1?staff_access=false&acadsem=" + mod.year + ";" + mod.sem + "&r_subj_code=" + mod.code + "&boption=Search&r_search_type=F\">(See in STARS)</a><span><button id=\"enall_" + mod.code + "\">Enable all</button><button id=\"disall_" + mod.code + "\">Disable all</button><button id=\"remove_" + mod.code + "\">Remove</button></span></p></li>");
        let p = $("<p id=\"modgrps_" + mod.code + "\"></p>");

        for (let grp of mod.groups) {
            let g = $("<label><input type=\"checkbox\" id=\"grpen_" + grp.id + "\" checked=\"checked\" /> " + grp.id + "</label>");
            g.data("module", mod);
            g.data("group", grp);
            p.append(g);
        }
        elem.append(p);
        elem.data("module", mod);
        elem.find("#enall_" + mod.code).click(function() {
            elem.find("#modgrps_" + mod.code + ' input[type="checkbox"]').prop('checked', true);
        });
        elem.find("#disall_" + mod.code).click(function() {
            elem.find("#modgrps_" + mod.code + ' input[type="checkbox"]').prop('checked', false);
        });
        elem.find("#remove_" + mod.code).click(function() {
            elem.remove();
        });
        if (origCode != mod.code) {
            $("#modli_" + mod.code).remove();
        }
        $("#modli_" + origCode).replaceWith(elem);
    },
    getEnabledModGroups: function() {
        let ret1 = {};
        for (let grp of $('#modsMods input[id^="grpen"]:checkbox:checked')) {
            grp = $(grp).parent();
            let modCode = grp.data("module").code;
            if (!(modCode in ret1)) {
                ret1[modCode] = [];
            }
            ret1[modCode].push(grp.data("group"));
        }

        let ret2 = [];
        for (let mod in ret1) {
            if ($("#moden_" + mod).prop("checked")) {
                ret2.push(ret1[mod]);
            }
        }

        return ret2;
    },
    addResults: function(permList) {
        let opt = $("#resChoose");
        opt.empty();
        let elems = [];
        for (let y of permList) {
            let text = "<option>" + y.groups.map(function(g) { return g.mod + " " + g.id.toString(); }).join("; ") + " (" + y.score + ")</option>";
            let elem = $(text);
            elem.data("perm", y);
            elems.push(elem);
        }
        opt.append(elems);
    },
    clearTimetable: function() {
        $("#resTimetable tbody td:not(:first-child)").removeClass().removeAttr("rowspan").empty();
    },
    showWeek: function(perm, week) {
        this.clearTimetable();
        if (!perm) {
            return;
        }
        
        let entries = perm.timetable.collapseWeeks()[week];
        for (let p of entries) {
            switch (p.type) {
                case "Class": {
                    let text = "<p>" + p.cls.mod + " " + p.cls.group + "</p><p>" + p.cls.type + "</p>";
                    if (p.pen != 0) {
                        text += "<p class=\"score\">" + p.pen + "</p>";
                    }
                    addClass(p.day, p.firstSlot, p.numSlots, text, "ttClass");
                    break;
                }
                default: {
                    let text = "<p>" + p.type + "</p>";
                    let elemClass = false;
                    switch (p.type) {
                        case "Lunch":
                            elemClass = "ttLunch";
                            break;
                        case "Free Day":
                            elemClass = "ttFreeDay";
                            break;
                    }
                    if (p.pen != 0) {
                        text += "<p class=\"score\">" + p.pen + "</p>";
                    }
                    addClass(p.day, p.firstSlot, p.numSlots, text, elemClass);
                    break;
                }
            }
        }

        function addClass(day, slot, num, html, elemClass) {
            let elem = form.getResultSlot(day, slot);
            elem.append(html);
            elem.attr("rowspan", num);

            if (elemClass) {
                elem.addClass(elemClass);
            }

            for (let s = 1; s < num; s++) {
                form.getResultSlot(day, slot + s).addClass("hide");
            }
        }
    },
    init: function() {
        for (let i = 0; i < slots.length; ++i) {
            $("#optSlotPenaltyTbl tbody").append(
                "<tr><td>" + slots[i] + "</td>" +
                "<td><input type=\"number\" id=\"pen0_" + i + "\" /></td>" +
                "<td><input type=\"number\" id=\"pen1_" + i + "\" /></td>" +
                "<td><input type=\"number\" id=\"pen2_" + i + "\" /></td>" +
                "<td><input type=\"number\" id=\"pen3_" + i + "\" /></td>" +
                "<td><input type=\"number\" id=\"pen4_" + i + "\" /></td></tr>");

            for (let j = 0; j < 5; j++) {
                restore("pen" + j + "_" + i);
            }

            $("#resTimetable tbody").append(
                "<tr><td>" + slots[i] + "</td>" +
                "<td id=\"res0_" + i + "\"></td>" +
                "<td id=\"res1_" + i + "\"></td>" +
                "<td id=\"res2_" + i + "\"></td>" +
                "<td id=\"res3_" + i + "\"></td>" +
                "<td id=\"res4_" + i + "\"></td></tr>");

            $("#optLunchStart, #optLunchEnd").append(
                "<option value=\"" + i + "\">" + slots[i] + "</option>"
            );
        }

        $("#optSlotPenaltyTbl input").change(persist);

        for (let id of
            ["optYear", "optSem", "optFreeDayBonus",
            "optLunchBonus", "optLunchStart",
            "optLunchEnd", "optLunchSlots"]
        ) {
            restore(id);
            $("#" + id).change(persist);
        }

        $('input[type="number"]').on('focus', function(e) {
            $(this).one('mouseup', function() {
                $(this).select();
                return false;
            }).select();
        });

        function persist(e) {
            cfg.setItem(e.target.id, $(e.target).val());
        }

        function restore(id, def) {
            $("#" + id).val(cfg.getItem(id) || def || "0");
        }
    },
    reset: function() {
        $("#modsMods").empty();
    }
};

const modinfo = {
    mods: {},
    getModule: function(code, year, sem) {
        let key = year + ";" + sem + ";" + code;
        if (key in this.mods) {
            let ret = $.Deferred();
            ret.resolve(this.mods[key]);
            return ret.promise();
        } else {
            return this.loadFromWish(code, year, sem).then(function(mod) {
                modinfo.mods[year + ";" + sem + ";" + mod.code] = mod;
                return mod;
            });
        }
    },
    loadFromWish: function(code, year, sem) {
        let url = "https://query.yahooapis.com/v1/public/yql?q=" + encodeURIComponent("SELECT * FROM html WHERE url = 'http://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1?staff_access=false&acadsem=" + year + ";" + sem + "&r_subj_code=" + code +"&boption=Search&r_search_type=F'");
        return $.get(url).then(function(data) {
            try {
                return parseSched($(data));
            } catch (e) {
                let ret = $.Deferred();
                ret.reject("", e.toString(), "");
                return ret;
            }
        });

        function parseSched(data) {
            let modCode = data.find("table:eq(0) td:eq(0)").text();
            let modTitle = data.find("table:eq(0) td:eq(1)").text();
            if (data.text().includes("No Courses found") || modCode.trim() == "" || modTitle.trim() == "") {
                let ret = $.Deferred();
                ret.reject("", "No such module", "");
                return ret;
            }
            let groups = [];

            let grpId;
            let classes = [];
            for (let row of data.find("table:eq(1) tr:gt(0)")) {
                let cols = $(row).find("td");
                let tGrpId = cols.eq(0).text().trim();
                let tClsType = cols.eq(1).text().trim();
                let tClsDay = cols.eq(3).text().trim();
                let tClsTime = cols.eq(4).text().trim();
                let tClsRem = cols.eq(6).text().trim();

                if (tGrpId != "") {
                    if (classes.length > 0) {
                        groups.push(new Group(grpId, modCode, classes));
                        classes = [];
                    }
                    grpId = parseInt(tGrpId, 10);
                }

                let day = parseDay(tClsDay);
                let weeks = parseRem(tClsRem);
                let startEnd = parseTime(tClsTime);
                classes.push(new Class(day, weeks, startEnd.first, startEnd.num, tClsType, grpId, modCode));
            }

            if (classes.length > 0) {
                groups.push(new Group(grpId, modCode, classes));
            }

            return new Module(modCode, year, sem, modTitle, groups);

            function parseDay(tDay) {
                switch (tDay) {
                    case "MON": return 0;
                    case "TUE": return 1;
                    case "WED": return 2;
                    case "THU": return 3;
                    case "FRI": return 4;
                    default: throw "Invalid day " + tDay;
                }
            }

            function parseRem(tRem) {
                if (tRem.trim() === "") {
                    return [0,1,2,3,4,5,6,7,8,9,10,11,12];
                } else if (tRem.startsWith("Wk")) {
                    tRem = tRem.substr(2).split(',');
                    let ret = [];
                    for (let wkStr of tRem) {
                        let range = wkStr.split('-');
                        if (range.length == 1) {
                            ret.push(parseInt(range[0], 10) - 1);
                        } else if (range.length == 2) {
                            let start = parseInt(range[0], 10) - 1;
                            let end = parseInt(range[1], 10) - 1;
                            
                            for (let wk = start; wk <= end; ++wk) {
                                ret.push(wk);
                            }
                        }
                    }
                    
                    return ret;
                } else {
                    throw "Unable to parse remark: " + tRem;
                }
            }

            function parseTime(tTime) {
                let startHr = parseInt(tTime.substr(0, 2), 10);
                let startMin = parseInt(tTime.substr(2, 2), 10);
                let endHr = parseInt(tTime.substr(5, 2), 10);
                let endMin = parseInt(tTime.substr(7, 2), 10);

                let startSlot = tts(startHr, startMin);
                let numSlot = tts(endHr, endMin) - startSlot;

                return {first: startSlot, num: numSlot};

                function tts(h, m) {
                    return (h - 8)*2 - (m == 30 ? 0 : 1);
                }
            }
        }
    },
    clear: function() {
        this.mods = {};
    }
};

function Module(code, year, sem, title, groups) {
    this.code = code;
    this.title = title;
    this.groups = groups;
    this.year = year;
    this.sem = sem;
}

function Group(id, mod, classes) {
    this.id = id;
    this.mod = mod;
    this.classes = classes;
}

function Class(day, weeks, firstSlot, numSlots, type, group, mod) {
    this.day = day;
    this.weeks = weeks;
    this.firstSlot = firstSlot;
    this.numSlots = numSlots;
    this.type = type;
    this.group = group;
    this.mod = mod;
}

function TimetableEntry(cls, pen, type, week, day, firstSlot, numSlots) {
    this.cls = cls;
    this.pen = pen;
    this.type = type;
    this.week = week;
    this.day = day;
    this.firstSlot = firstSlot;
    this.numSlots = numSlots;
}

function TimetableArray(init, def) {
    this.array = init || [];
    if (!init) {
        for (let i = 0; i < (nSlots * nDays * nWeeks); ++i) {
            this.array.push(def === undefined ? false : def);
        }
    }
    
    this.get = function(week, day, slot) {
        return this.array[idx(week, day, slot)];
    }
    
    this.set = function(week, day, slot, to) {
        let orig = this.get(week, day, slot);
        this.array[idx(week, day, slot)] = to;
        return orig;
    }
    
    this.clone = function() {
        return new TimetableArray(this.array.slice(0));
    }
    
    this.collapseWeeks = function() {
        let uniq = new Set(this.array);
        uniq.delete(false);
        let ret = [];
        for (let week = 0; week < nWeeks; ++week) {
            ret.push([]);
        }
        for (let ent of uniq) {
            ret[ent.week].push(ent);
        }
        for (let week of ret) {
            week.sort(function(a, b) {
                return a.firstSlot - b.firstSlot;
            });
        }
        return ret;
    }
    
    function idx(week, day, slot) {
        return (week*nDays + day)*nSlots + slot;
    }
}

function init() {
    const CONFIG_VER = 7;
    let ver = parseInt(cfg.getItem("initialised"), 10);
    if (!cfg.getItem("initialised") || isNaN(ver) || ver < CONFIG_VER) {
        let defaults = {"pen4_18":"20","pen4_13":"20","pen3_27":"20","pen0_3":"1","pen4_29":"20","pen2_20":"20","pen4_9":"20","pen0_26":"20","pen3_23":"20","pen1_2":"1","pen2_2":"1","pen4_12":"20","pen1_24":"20","pen3_20":"20","pen3_1":"20","pen4_26":"20","pen2_28":"20","pen2_21":"20","pen0_25":"20","pen1_1":"20","pen4_15":"20","pen1_25":"20","pen3_28":"20","pen4_27":"20","pen2_29":"20","pen2_22":"20","pen1_26":"20","pen0_24":"20","pen1_0":"20","pen4_14":"20","pen3_0":"20","pen3_29":"20","pen3_22":"20","pen4_24":"20","pen2_0":"20","pen3_21":"20","pen2_23":"20","pen4_17":"20","pen1_27":"20","pen4_25":"20","pen0_23":"20","pen0_22":"20","pen4_16":"20","pen1_20":"20","pen0_28":"20","pen2_25":"20","pen4_22":"20","pen2_24":"20","pen4_21":"20","pen4_2":"0","pen1_28":"20","pen1_21":"20","pen3_24":"20","pen0_0":"20","pen4_23":"20","pen3_3":"1","pen0_21":"20","pen2_1":"20","pen4_11":"20","pen1_29":"20","pen1_22":"20","pen3_25":"20","pen0_1":"20","pen4_20":"20","pen2_26":"20","pen0_29":"20","pen0_20":"20","pen4_0":"20","pen4_19":"20","pen4_10":"20","pen0_27":"20","pen1_23":"20","pen3_26":"20","pen0_2":"1","pen4_28":"20","pen3_2":"1","pen2_27":"20","pen4_8":"20","pen4_1":"20","pen1_3":"1","pen2_3":"1","optYear":"2016","optSem":"2","optLunchSlots":"1","optLunchStart":"5","optLunchEnd":"11","optFreeDayBonus":"500","optLunchBonus":"20"};
        for (let k in defaults) {
            if (cfg.getItem(k) === null) {
                cfg.setItem(k, defaults[k]);
            }
        }
        cfg.setItem("initialised", CONFIG_VER);
    }

    $("#modsAdd").click(clickAddMod);
    $("#modsCalculate").click(clickCalc);
    $("#resChoose").change(showResult);
    $("#resPrev").click(clickResPrev);
    $("#resNext").click(clickResNext);
    $("#resWeek").change(showWeek);
    $("#resPrevWeek").click(clickResPrevWeek);
    $("#resNextWeek").click(clickResNextWeek);
    $("#optExport").click(clickExport);
    $("#optImport").click(clickImport);
    form.init();
}

function processAddMod() {
    let codes = form.getAddModCode().split(";");
    let yr = form.getYear();
    let sem = form.getSem();
    let promises = [];
    for (let coder of codes) {
        let code = coder; // closure cannot close over coder
        // otherwise form.addModInfo gets the last value of coder
        code = code.trim();
        form.addModPlaceholder(code);
        promises.push(modinfo.getModule(code, yr, sem).done(function(mod) {
            form.addModInfo(code, mod);
        }).fail(function(_, e1, e2) {
            alert("Error loading module (check browser console?) " + code + ": " + e1 + " " + e2);
            form.removeMod(code);
        }));
    }
    return promises;
}

function clickAddMod() {
    processAddMod();
    return false;
}

function clickCalc() {
    form.clearTimetable();
    let mg = form.getEnabledModGroups();
    if (mg.length == 0 && form.getAddModCode().trim().length > 0) {
        $.when.apply($, processAddMod()).done(clickCalc);
        return;
    }
    let result = calc(mg);
    form.addResults(result);
    $("#resChoose").change();
    if (result.length == 0) {
        alert("No possible combinations found. Please check if any of your modules are online only; this tool cannot detect that.");
    }
}

function showResult() {
    form.setSelectedWeek(0);
    showWeek();
}

function showWeek() {
    let week = form.getSelectedWeek();
    $("#resTblWeek").text("Week " + (week+1));
    form.showWeek(form.getSelectedPerm(), week);
}

function clickResPrev() {
    let e = $("#resChoose");
    e.prop("selectedIndex", Math.max(0, e.prop("selectedIndex") - 1));
    e.change();
}

function clickResNext() {
    let e = $("#resChoose");
    e.prop("selectedIndex", Math.min(e.children().length - 1, e.prop("selectedIndex") + 1));
    e.change();
}

function clickResNextWeek() {
    form.setSelectedWeek(form.getSelectedWeek() + 1);
    showWeek();
}

function clickResPrevWeek() {
    form.setSelectedWeek(form.getSelectedWeek() - 1);
    showWeek();
}

function clickExport() {
    window.prompt("Copy and share the settings.", cfg.exportJson());
}

function clickImport() {
    let json = window.prompt("Paste the settings.");
    if (!json) {
        return;
    }
    let obj = cfg.importJson(json);
    location.reload();
}

function calc(mg) {
    let pen = form.getConfig();
    let ret = [];
    permute(0, [], new TimetableArray());
    ret.sort(function(a, b) {
        return b.score - a.score;
    });
    return ret;

    function permute(curModIdx, curPermRef, curTimetableRef) {
        if (curModIdx >= mg.length) {
            return;
        }
        let end = (curModIdx + 1) == mg.length;
        for (let group of mg[curModIdx]) {
            let curPerm = curPermRef.slice(0);
            curPerm.push(group);
            let curTimetable = curTimetableRef.clone();
            let clash = false;
            for (let cls of group.classes) {
                for (let wk of cls.weeks) {
                    let ttEnt = new TimetableEntry(cls, 0, "Class", wk, cls.day, cls.firstSlot, cls.numSlots);
                    for (let slot = cls.firstSlot; slot < cls.firstSlot + cls.numSlots; slot++) {
                        if (curTimetable.set(wk, cls.day, slot, ttEnt)) {
                            clash = true;
                            break;
                        }
                    }
                    
                    if (clash) {
                        break;
                    }
                }
                
                if (clash) {
                    break;
                }
            }

            if (clash) {
                continue;
            }

            if (end) {
                let score2 = score(curTimetable);
                ret.push({score: score2, groups: curPerm, timetable: curTimetable});
            } else {
                permute(curModIdx+1, curPerm.slice(0), curTimetable.clone());
            }
        }
    }

    function score(t) {
        let r = 0;
        for (let week = 0; week < nWeeks; week++) {
            for (let day = 0; day < nDays; day++) {
                let haveClass = false;
                for (let slot = 0; slot < nSlots; slot++) {
                    let e = t.get(week, day, slot);
                    let p = pen.slots.get(week, day, slot);
                    haveClass = haveClass || !!e;
                    if (e && p != 0) {
                        r -= p;
                        e.pen -= p;
                    }
                }
                
                if (!haveClass) {
                    let ttEnt = new TimetableEntry(false, pen.free, "Free Day", week, day, 0, nSlots);
                    for (let slot = 0; slot < nSlots; slot++) {
                        t.set(week, day, slot, ttEnt);
                    }
                    r += pen.free;
                } else {
                    let lunchStart = form.getLunchStart();
                    let lunchEnd = Math.max(form.getLunchEnd(), lunchStart);
                    let lunchSlots = Math.max(form.getLunchSlots(), 1);
                    let lunchFrom = lunchStart;
                    let streak = 0;
                    let streaks = [];
                    for (let s = lunchStart; s <= lunchEnd; s++) {
                        if (t.get(week, day, s)) {
                            if (streak >= lunchSlots) {
                                streaks.push({start: lunchFrom, n: streak});
                            }
                            lunchFrom = s+1;
                            streak = 0;
                        } else {
                            streak++;
                        }
                    }

                    if (streak >= lunchSlots) {
                        streaks.push({start: lunchFrom, n: streak});
                    }

                    if (streaks.length > 0) {
                        r += pen.lunch;
                        let lunch = {n: 0, start: 0};
                        for (let streak of streaks) {
                            if (streak.n > lunch.n) {
                                lunch = streak;
                            }
                        }
                        let ttEnt = new TimetableEntry(false, pen.lunch, "Lunch", week, day, lunch.start, lunch.n);
                        for (let i = lunch.start; i < lunch.start + lunch.n; ++i) {
                            t.set(week, day, i, ttEnt);
                        }
                    }
                }
            }
        }
        return r;
    }
}

$(init);
})();