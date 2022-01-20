package panda.reppy.commands;

import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import panda.reppy.flags.CommandCondition;

import java.util.Arrays;
import java.util.List;

public abstract class ConditionalCommand extends BaseCommand {

    private final List<CommandCondition> commandConditionList;

    public ConditionalCommand(final String name, final String description,
                              CommandCondition... commandConditions) {
        this(name, description, Arrays.asList(commandConditions));
    }

    private ConditionalCommand(final String name, final String description,
                               final List<CommandCondition> commandConditions) {
        super(name, description);
        commandConditionList = commandConditions;
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        boolean hasPermission = false;

        for (CommandCondition condition : commandConditionList) {
            if (condition.meetsCondition(event.getMember())) {
                hasPermission = true;
                break;
            }
        }

        if (!hasPermission) {
            event.reply("You do not have permission to execute this command.").setEphemeral(true).queue();
        }

        return hasPermission;
    }
}
