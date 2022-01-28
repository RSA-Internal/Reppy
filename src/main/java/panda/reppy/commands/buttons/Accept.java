package panda.reppy.commands.buttons;

import net.dv8tion.jda.api.entities.Guild;
import net.dv8tion.jda.api.entities.Member;
import net.dv8tion.jda.api.entities.Message;
import net.dv8tion.jda.api.entities.MessageEmbed;
import net.dv8tion.jda.api.events.interaction.ButtonClickEvent;
import panda.reppy.database.ModelDao;
import panda.reppy.database.models.DatabaseModel;

import static panda.reppy.entities.AnswerEmbed.generateAnswerEmbed;

public class Accept {

    // TODO Implement acceptance by other members.
    // TODO Mark thread as [Solved].
    // TODO Archive/Lock thread.
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
        }

        DatabaseModel answerModel = ModelDao.retrieveAnswerModel(event.getChannel().getId(), message.getId());

        if (answerModel == null) {
            event.reply("This answer is no longer valid.").setEphemeral(true).queue();
            return;
        }

        answerModel.setAccepted(true);
        ModelDao.updateModelData(answerModel);

        String authorId = answerModel.getAuthorId();
        Guild guild = event.getGuild();
        if (guild != null) {
            Member author = guild.getMemberById(authorId);

            MessageEmbed oldEmbed = message.getEmbeds().get(0);
            String content = oldEmbed.getFields().get(0).getValue();

            MessageEmbed updatedEmbed = generateAnswerEmbed(author, content, message.getId(), true, true);
            message.editMessageEmbeds(updatedEmbed).queue();
            event.reply("You successfully marked this answer as accepted.").setEphemeral(true).queue();
        }
    }
}
