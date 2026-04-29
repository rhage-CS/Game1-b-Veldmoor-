// Inventory helpers (patched onto engine)
Engine.prototype.hasItem = function(item) {
    return this.inventory && this.inventory.has(item);
};

Engine.prototype.giveItem = function(item) {
    if (!this.inventory) this.inventory = new Set();
    if (!this.inventory.has(item)) {
        this.inventory.add(item);
        const labels = {
            ash_fragment:   "Ash fragment added to inventory.",
            signet_ring:    "Signet ring added to inventory.",
            wax_seal:       "Wax seal added to inventory.",
            cargo_manifest: "Cargo manifest added to inventory.",
            ledger_copy:    "Ledger copy added to inventory.",
            nobles_pass:    "Noble's pass added to inventory.",
            cipher_note:    "Cipher note added to inventory.",
            auction_ledger: "Auction ledger added to inventory.",
            decryption_key: "Decryption key added to inventory.",
            stolen_brooch:  "Stolen brooch added to inventory.",
            pias_testimony: "Pia's testimony added to inventory.",
            palace_key:     "Palace key added to inventory.",
            signed_orders:  "Signed orders added to inventory."
        };
        this.show('<em style="color:#7dffc0;">[ ' + (labels[item] || item + ' added to inventory.') + ' ]</em>');
    }
};

Engine.prototype.showInventory = function() {
    if (!this.inventory || this.inventory.size === 0) return null;
    const labels = {
        ash_fragment:   "Ash fragment",
        signet_ring:    "Signet ring",
        wax_seal:       "Wax seal",
        cargo_manifest: "Cargo manifest",
        ledger_copy:    "Ledger copy",
        nobles_pass:    "Noble's pass",
        cipher_note:    "Cipher note",
        auction_ledger: "Auction ledger",
        decryption_key: "Decryption key",
        stolen_brooch:  "Stolen brooch",
        pias_testimony: "Pia's testimony",
        palace_key:     "Palace key",
        signed_orders:  "Signed orders"
    };
    const list = [...this.inventory].map(i => labels[i] || i).join(", ");
    return "Carrying: " + list;
};

// Start
class Start extends Scene {
    create() {
        console.log('storyData', this.engine.storyData);
        this.engine.inventory = new Set();
        this.engine.setTitle(this.engine.storyData.Title);
        this.engine.addChoice("Begin the story");
    }

    handleChoice() {
        this.engine.gotoScene(Location, this.engine.storyData.InitialLocation);
    }
}

// Location
class Location extends Scene {
    create(key) {
        this.key = key;
        let locationData = this.engine.storyData.Locations[key];

        this.engine.show(locationData.Body);

        // only show inventory line when the player is actually carrying something
        const inv = this.engine.showInventory();
        if (inv) {
            this.engine.show('<small style="color:#888899;">' + inv + '</small>');
        }

        // Ledger mechanism
        // If the location JSON has "Mechanism": "ledger", handle it here.
        // The JSON flags it; this code interprets it.
        if (locationData.Mechanism === "ledger") {
            this.ledgerPage = 0;
            this.ledgerPages = [
                "Page 1 — Cargo: 40 crates of spiced grain. Origin: Southport. Consignee: Veldmoor Market Exchange. Cleared.",
                "Page 2 — Cargo: 12 unmarked crates. Origin: unknown. No duty paid. Flagged then unflagged — someone amended this entry by hand.",
                "Page 3 — Cargo: 8 crates listed as 'dry goods'. Destination: Noble Quarter, private residence. Consignee name blotted out. The address is still legible. It matches the Lord's manor."
            ];
            this.showLedgerPage();
            return;
        }

        this.showChoices(locationData);
    }

    showLedgerPage() {
        let locationData = this.engine.storyData.Locations[this.key];
        this.engine.show('<em style="color:#ffd466;">[ Ledger — page ' + (this.ledgerPage + 1) + ' of ' + this.ledgerPages.length + ' ]</em>');
        this.engine.show(this.ledgerPages[this.ledgerPage]);

        if (this.ledgerPage < this.ledgerPages.length - 1) {
            this.engine.addChoice("Turn to next page", { action: "ledger_next" });
        } else {
            this.engine.show('<em style="color:#7dffc0;">[ You have read all three pages. The destination connects the smuggling route to the Noble Quarter. ]</em>');
            this.engine.giveItem("cargo_manifest");
        }

        this.showChoices(locationData);
    }

    showChoices(locationData) {
        if (locationData.Choices && locationData.Choices.length > 0) {
            for (let choice of locationData.Choices) {
                // lock-and-key: if choice needs an item the player lacks, show locked
                const locked = choice.RequiresItem && !this.engine.hasItem(choice.RequiresItem);
                if (locked) {
                    const msg = choice.LockedText || "You don't have what you need for this.";
                    this.engine.addChoice("🔒 " + choice.Text, { locked: true, lockedMsg: msg });
                } else {
                    this.engine.addChoice(choice.Text, choice);
                }
            }
        } else {
            this.engine.addChoice("The end.");
        }
    }

    handleChoice(choice) {
        if (choice) {
            // locked choice: show message and re-render this location
            if (choice.locked) {
                this.engine.show('<em style="color:#ffd466;">[ ' + choice.lockedMsg + ' ]</em>');
                this.engine.gotoScene(Location, this.key);
                return;
            }

            // ledger page turn
            if (choice.action === "ledger_next") {
                this.ledgerPage++;
                this.showLedgerPage();
                return;
            }

            // normal choice: give item if any, then navigate
            this.engine.show("&gt; " + choice.Text);

            if (choice.GivesItem) {
                this.engine.giveItem(choice.GivesItem);
            }

            if (choice.Target) {
                this.engine.gotoScene(Location, choice.Target);
            } else {
                this.engine.gotoScene(End);
            }

        } else {
            this.engine.gotoScene(End);
        }
    }
}

// End 
class End extends Scene {
    create() {
        this.engine.show("<hr>");
        this.engine.show(this.engine.storyData.Credits);
    }
}

Engine.load(Start, 'myStory.json');