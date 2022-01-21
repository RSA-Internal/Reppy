package panda.reppy.commands;

import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.interactions.commands.build.CommandData;

public abstract class BaseCommand extends CommandData {

    public BaseCommand(final String name, final String description) {
        super(name, description);
    }

    public abstract boolean execute(SlashCommandEvent event);
}
