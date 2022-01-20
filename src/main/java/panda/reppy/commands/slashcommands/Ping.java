package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import panda.reppy.commands.BaseCommand;

public class Ping extends BaseCommand {

    public Ping() {
        super("ping", "Calculate latency of the bot.");
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        long time = System.currentTimeMillis();
        event.reply("Pong!") // reply or acknowledge
                .flatMap(v ->
                        event.getHook().editOriginalFormat("Pong: %d ms", System.currentTimeMillis() - time) // then edit original
                ).queue(); // Queue both reply and edit
        return true;
    }
}
