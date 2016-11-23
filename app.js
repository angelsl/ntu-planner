(function() {
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

const form = {
    getConfig: function() {
        let sp = new Array(nSlots * 10);
        for (let s = 0; s < nSlots; ++s) {
            for (let d = 0; d < 5; ++d) {
                let tsp = this.getSlotPenalty(d, s);
                sp[d*nSlots + s] = tsp;
                sp[(d+5)*nSlots + s] = tsp;
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
    getResultSlot: function(week, day, slot) {
        return $("#res" + week + day + "_" + slot);
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
    showPermutation: function(perm) {
        this.clearTimetable();
        if (!perm) {
            return;
        }
        for (let g of perm.groups) {
            for (let c of g.classes) {
                let pen = 0;
                for (let s = 0; s < c.numSlots; s++) {
                    for (let p of perm.penalties[((c.even ? 5 : 0) + c.day)*nSlots + c.firstSlot + s]) { // TODO fixme ugly
                        if (p.type == "Slot Penalty") {
                            pen += p.value;
                        }
                    }
                }
                let text = "<p>" + g.mod + " " + g.id + "</p><p>" + c.type + "</p>";
                if (pen != 0) {
                    text += "<p>Score: " + pen + "</p>";
                }
                addClass(c.odd, c.even, c.day, c.firstSlot, c.numSlots, text, "ttClass");
            }
        }
        for (let i = 0; i < perm.penalties.length; i++) {
            let s = perm.penalties[i];
            for (let p of s) {
                if (p.type == "Slot Penalty") {
                    continue;
                }
                let text = "<p>" + p.type + "</p>";
                if (p.value != 0) {
                    text += "<p>Score: " + p.value + "</p>";
                }
                let day = Math.floor(i/nSlots);
                let elemClass = false;
                switch (p.type) {
                    case "Lunch":
                        elemClass = "ttLunch";
                        break;
                    case "Free Day":
                        elemClass = "ttFreeDay";
                        break;
                }
                addClass(day < 5, day >= 5, day % 5, i - day*nSlots, p.num, text, elemClass);
            }
        }

        function addClass(odd, even, day, slot, num, html, elemClass) {
            function helper(week, day, slot, num, html) {
                let elem = form.getResultSlot(week, day, slot);
                elem.append(html);
                elem.attr("rowspan", num);

                if (elemClass) {
                    elem.addClass(elemClass);
                }

                for (let s = 1; s < num; s++) {
                    form.getResultSlot(week, day, slot + s).addClass("hide");
                }
            }

            if (odd) {
                helper(0, day, slot, num, html);
            }

            if (even) {
                helper(1, day, slot, num, html);
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
                "<td id=\"res00_" + i + "\"></td>" +
                "<td id=\"res01_" + i + "\"></td>" +
                "<td id=\"res02_" + i + "\"></td>" +
                "<td id=\"res03_" + i + "\"></td>" +
                "<td id=\"res04_" + i + "\"></td>" +
                "<td id=\"res10_" + i + "\"></td>" +
                "<td id=\"res11_" + i + "\"></td>" +
                "<td id=\"res12_" + i + "\"></td>" +
                "<td id=\"res13_" + i + "\"></td>" +
                "<td id=\"res14_" + i + "\"></td></tr>");

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
            localStorage.setItem(e.target.id, $(e.target).val());
        }

        function restore(id, def) {
            $("#" + id).val(localStorage.getItem(id) || def || "0");
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
                let oddEven = parseRem(tClsRem);
                let startEnd = parseTime(tClsTime);
                classes.push(new Class(day, oddEven.odd, oddEven.even, startEnd.first, startEnd.num, tClsType));
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
                if (tRem.startsWith("Wk1,3")) {
                    return {odd: true, even: false};
                } else if (tRem.startsWith("Wk2,4")) {
                    return {odd: true, even: false};
                } else {
                    return {odd: true, even: true};
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

function Class(day, odd, even, firstSlot, numSlots, type) {
    this.day = day;
    this.odd = odd;
    this.even = even;
    this.firstSlot = firstSlot;
    this.numSlots = numSlots;
    this.type = type;
}

function init() {
    const CONFIG_VER = 7;
    let ver = parseInt(localStorage.initialised, 10);
    if (!localStorage.initialised || isNaN(ver) || ver < CONFIG_VER) {
        let defaults = {"pen4_18":"80","pen4_13":"80","pen3_27":"80","pen0_3":"40","pen4_29":"80","pen2_20":"80","pen4_9":"80","pen0_26":"80","pen3_23":"80","pen1_2":"40","pen2_2":"40","pen4_12":"80","pen1_24":"80","pen3_20":"80","pen3_1":"40","pen4_26":"80","pen2_28":"80","pen2_21":"80","pen0_25":"80","pen1_1":"40","pen4_15":"80","pen1_25":"80","pen3_28":"80","pen4_27":"80","pen2_29":"80","pen2_22":"80","pen1_26":"80","pen0_24":"80","pen1_0":"40","pen4_14":"80","pen3_0":"40","pen3_29":"80","pen3_22":"80","pen4_24":"80","pen2_0":"40","pen3_21":"80","pen2_23":"80","pen4_17":"80","pen1_27":"80","pen4_25":"80","pen0_23":"80","pen0_22":"80","pen4_16":"80","pen1_20":"80","pen0_28":"80","pen2_25":"80","pen4_22":"80","pen2_24":"80","pen4_21":"80","pen4_2":"0","pen1_28":"80","pen1_21":"80","pen3_24":"80","pen0_0":"40","pen4_23":"80","pen3_3":"40","pen0_21":"80","pen2_1":"40","pen4_11":"80","pen1_29":"80","pen1_22":"80","pen3_25":"80","pen0_1":"40","pen4_20":"80","pen2_26":"80","pen0_29":"80","pen0_20":"80","pen4_0":"40","pen4_19":"80","pen4_10":"80","pen0_27":"80","pen1_23":"80","pen3_26":"80","pen0_2":"40","pen4_28":"80","pen3_2":"40","pen2_27":"80","pen4_8":"80","pen4_1":"40","pen1_3":"40","pen2_3":"40","optYear":"2016","optSem":"2","optLunchSlots":"2","optLunchStart":"5","optLunchEnd":"10","optFreeDayBonus":"5000","optLunchBonus":"160"};
        for (let k in defaults) {
            if (localStorage.getItem(k) === null) {
                localStorage.setItem(k, defaults[k]);
            }
        }
        localStorage.initialised = CONFIG_VER;
    }

    $("#modsAdd").click(clickAddMod);
    $("#modsCalculate").click(clickCalc);
    $("#resChoose").change(showResult);
    $("#resPrev").click(clickResPrev);
    $("#resNext").click(clickResNext);
    $("#optExport").click(clickExport);
    $("#optImport").click(clickImport);
    form.init();
}

function clickAddMod() {
    let codes = form.getAddModCode().split(";");
    let yr = form.getYear();
    let sem = form.getSem();
    for (let coder of codes) {
        let code = coder; // closure cannot close over coder
        // otherwise form.addModInfo gets the last value of coder
        code = code.trim();
        form.addModPlaceholder(code);
        modinfo.getModule(code, yr, sem).done(function(mod) {
            form.addModInfo(code, mod);
        }).fail(function(_, e1, e2) {
            alert("Error loading module (check browser console?) " + code + ": " + e1 + " " + e2);
            form.removeMod(code);
        });
    }
    return false;
}

function clickCalc() {
    form.clearTimetable();
    let result = calc(form.getEnabledModGroups());
    form.addResults(result);
    $("#resChoose").change();
}

function showResult(e) {
    let perm = $("#resChoose").find("option:selected").data("perm");
    form.showPermutation(perm);
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

function clickExport() {
    window.prompt("Copy and share the settings.", JSON.stringify(localStorage));
}

function clickImport() {
    let json = window.prompt("Paste the settings.");
    if (!json) {
        return;
    }
    let obj = JSON.parse(json);
    localStorage.clear();
    for (let k in obj) {
        localStorage.setItem(k, obj[k]);
    }
    location.reload();
}

function calc(mg) {
    let pen = form.getConfig();
    let ret = [];
    permute(0, [], new Timetable());
    ret.sort(function(a, b) {
        return b.score - a.score;
    });
    return ret;

    function permute(i, x, y) {
        if (i >= mg.length) {
            return;
        }
        let end = (i + 1) == mg.length;
        for (let group of mg[i]) {
            let g = x.slice(0);
            g.push(group);
            let t = y.clone();
            let clash = false;
            for (let cls of group.classes) {
                for (let s = 0; s < cls.numSlots; s++) {
                    if ((cls.odd && t.set(0, cls.day, s + cls.firstSlot)) || (cls.even && t.set(1, cls.day, s + cls.firstSlot))) {
                        clash = true;
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
                let score2 = score(t);
                ret.push({score: score2.score, groups: g, penalties: score2.penalties});
            } else {
                permute(i+1, g.slice(0), t.clone());
            }
        }
    }

    function score(t) {
        let r = 0;
        let p = [];
        for (let i = 0; i < t.slots.length; i++) {
            p.push([]);
            if (t.slots[i] && pen.slots[i] != 0) {
                r -= pen.slots[i];
                p[i].push({type: "Slot Penalty", value: -pen.slots[i], num: 1});
            }
        }
        for (let d = 0; d < 10; d++) {
            let haveClass = false;
            for (let s = 0; s < nSlots; s++) {
                if (t.slots[d*nSlots + s]) {
                    haveClass = true;
                    break;
                }
            }
            if (!haveClass) {
                r += pen.free;
                p[d*nSlots].push({type: "Free Day", value: pen.free, num: nSlots});
            }

            let lunchStart = form.getLunchStart();
            let lunchEnd = form.getLunchEnd();
            let lunchSlots = form.getLunchSlots();
            let lunchFrom = lunchStart;
            let streak = 0;
            let streaks = [];
            for (let s = lunchStart; s <= lunchEnd; s++) {
                if (t.slots[d*nSlots + s]) {
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
                p[d*nSlots + lunch.start].push({type: "Lunch", value: pen.lunch, num: lunch.n});
            }
        }
        return {score: r, penalties: p};
    }

    function Timetable(slots) {
        this.slots = slots || new Array(nSlots * 10).fill(false);
        this.set = function(week, day, slot) {
            let i = (week*5 + day)*nSlots + slot;
            if (slots[i]) {
                return true;
            }
            slots[i] = true;
            return false;
        };
        this.clone = function() {
            return new Timetable(this.slots.slice(0));
        };
    }
}

$(init);
})();