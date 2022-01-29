package panda.reppy.commands.buttons;

import net.dv8tion.jda.api.entities.*;
import net.dv8tion.jda.api.events.interaction.ButtonClickEvent;
import panda.reppy.database.ModelDao;
import panda.reppy.database.models.DatabaseModel;

import static panda.reppy.entities.AnswerEmbed.generateAnswerEmbed;

public class Accept {

    public static void process(ButtonClickEvent event) {
        Message message = event.getMessage();
        Member actor = event.getMember();

        if (actor == null) {
            event.reply("Failed to fetch event member.").setEphemeral(true).queue();
            return;
        }

        String actorId = actor.getId();

        DatabaseModel questionModel = ModelDao.retrieveQuestionModel(event.getChannel().getId());

        if (!questionModel.getAuthorId().equals(actorId)) {
            event.reply("You can not mark an answer as accepted on someone else's question.")
                    .setEphemeral(true)
                    .queue();
            return;
        }

        Boolean isAnswered = questionModel.getIsAnswered();

        if (isAnswered != null && isAnswered) {
            event.reply("This question already has a marked answer.").setEphemeral(true).queue();
            return;
        }

        DatabaseModel answerModel = ModelDao.retrieveAnswerModel(event.getChannel().getId(), message.getId());

        if (answerModel == null) {
            event.reply("This answer is no longer valid.").setEphemeral(true).queue();
            return;
        }

        answerModel.setAccepted(true);
        ModelDao.updateModelData(answerModel);

        questionModel.setIsAnswered(true);
        ModelDao.updateModelData(questionModel);

        String authorId = answerModel.getAuthorId();
        Guild guild = event.getGuild();
        if (guild != null) {
            Member author = guild.getMemberById(authorId);

            MessageEmbed oldEmbed = message.getEmbeds().get(0);
            String content = oldEmbed.getFields().get(0).getValue();

            MessageEmbed updatedEmbed = generateAnswerEmbed(author, content, message.getId(), true, true);
            message.editMessageEmbeds(updatedEmbed).queue();
            event.reply("You successfully marked this answer as accepted.").setEphemeral(true).queue(success -> {
                MessageChannel channel = event.getChannel();
                if (channel.getType() == ChannelType.GUILD_PUBLIC_THREAD) {
                    ThreadChannel thread = (ThreadChannel) channel;
                    thread.getManager().setName(String.format("[Solved] %s", thread.getName())).queue(success2 ->
                        thread.getManager().setArchived(true).setLocked(true).queue());
                }
            });
        }
    }
}
