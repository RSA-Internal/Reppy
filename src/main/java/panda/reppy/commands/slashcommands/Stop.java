package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import panda.reppy.commands.ConditionalCommand;
import panda.reppy.util.constants.CommandConditionConstants;

public class Stop extends ConditionalCommand {

    public Stop() {
        super("stop", "Stops the bot in a safe manner.", CommandConditionConstants.OWNER_CONDITION);
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        boolean valid = super.execute(event);

        if (valid) {
            event.reply("Shutting down safely.").setEphemeral(true).queue(success -> {
                event.getJDA().shutdown();
            });
        }

        return valid;
    }
}
