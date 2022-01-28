package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.entities.*;
import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.interactions.commands.OptionType;
import net.dv8tion.jda.api.interactions.components.Button;
import org.jetbrains.annotations.Contract;
import panda.reppy.commands.BaseCommand;
import panda.reppy.database.ModelDao;
import panda.reppy.util.constants.SnowflakeConstants;

import static panda.reppy.entities.AnswerEmbed.generateAnswerEmbed;

public class ConvertAnswer extends BaseCommand {

    public ConvertAnswer() {
        super("convert-answer", "Convert a pre-existing message into an answer.");

        addOption(OptionType.STRING, "message-id", "The message ID of the message to convert.", true);
    }

    @Contract("_, null -> fail")
    private boolean isValidThread(MessageChannel channel, ThreadChannel thread) {
        if (channel.getType() != ChannelType.GUILD_PUBLIC_THREAD) return false;
        if (thread == null) return false;
        return thread.getParentChannel().getId().equals(SnowflakeConstants.THREAD_CHANNEL_ID);
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        Guild guild = event.getGuild();
        Member executor = event.getMember();
        if (executor == null) {
            event.reply("Failed to fetch command member.").setEphemeral(true).queue();
            return false;
        }

        if (guild == null) {
            event.reply("Failed to fetch guild.").setEphemeral(true).queue();
            return false;
        }

        MessageChannel channel = event.getChannel();
        ThreadChannel thread = guild.getThreadChannelById(channel.getId());

        if (!isValidThread(channel, thread)) {
            event.reply("This command must be executed in a valid thread.").setEphemeral(true).queue();
            return false;
        }

        String providedMessageId = event.getOptions().get(0).getAsString();
        MessageHistory messageHistory = thread.getHistoryAround(providedMessageId, 10).complete();
        if (messageHistory.isEmpty()) {
            event.reply("Unable to fetch thread history.").setEphemeral(true).queue();
            return false;
        }

        Message message = messageHistory.getMessageById(providedMessageId);
        if (message == null) {
            event.reply("The provided ID does not correlate to a message in this Thread.").setEphemeral(true)
                    .queue();
            return false;
        }
        Member author = message.getMember();
        if (author == null) {
            event.reply("Failed to fetch message author.").setEphemeral(true).queue();
            return false;
        }

        if (!message.getMember().getId().equals(executor.getId())) {
            event.reply("You can not convert another member's message to an answer.").setEphemeral(true).queue();
            return false;
        }

        MessageEmbed answerEmbed = generateAnswerEmbed(author, message.getContentRaw(), message.getId(), false, false);

        event.replyEmbeds(answerEmbed)
                .addActionRow(
                        Button.success("upvote", Emoji.fromMarkdown("<:upvote:934992735033761832>")),
                        Button.danger("downvote", Emoji.fromMarkdown("<:downvote:934992734945685504>")),
                        Button.secondary("accept", Emoji.fromMarkdown("<:yes:933486223723483216>"))
                )
                .queue(response -> {
                    message.delete().queue();
                    response.retrieveOriginal().queue(responseMessage -> {
                        ModelDao.generateAnswerModel(thread, author, responseMessage.getId(), false);
                    });
                });


        return true;
    }


}
